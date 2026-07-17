import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server misconfiguration.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

    const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized." }, 401);
    const authUser = userData.user;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) return json({ error: "Missing session_id." }, 400);

    // Load session
    const { data: session, error: sErr } = await admin
      .from("attendance_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) return json({ error: "Attendance session not found." }, 404);
    if (session.status !== "active") return json({ error: "Attendance session is not active." }, 409);

    // Authorization: only the owning lecturer (or admin) may mint QR tokens.
    const { data: requester } = await admin
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();
    const isOwner = await (async () => {
      if (requester?.role === "super_admin" || requester?.role === "administrator") return true;
      const { data: lec } = await admin
        .from("lecturers")
        .select("id")
        .eq("user_id", authUser.id)
        .maybeSingle();
      return !!lec && lec.id === session.lecturer_id;
    })();
    if (!isOwner) return json({ error: "Forbidden." }, 403);

    // Load rotation setting
    const { data: settingRow } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "qr_rotation_seconds")
      .maybeSingle();
    const rotationSeconds = Number(settingRow?.value ?? session.qr_rotation_seconds ?? 10);

    // Generate a fresh token. Stored in a durable table (qr_tokens) so any
    // edge instance can validate it — module-level state is NOT shared.
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const now = Date.now();
    const expiresAt = new Date(now + rotationSeconds * 1000).toISOString();

    const { error: insertErr } = await admin.from("qr_tokens").insert({
      attendance_session_id: session.id,
      token,
      issued_at: new Date(now).toISOString(),
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    return json(
      {
        session_id: session.id,
        token,
        expires_at: expiresAt,
        rotation_seconds: rotationSeconds,
      },
      200
    );
  } catch (err) {
    console.error("qr-token error:", err);
    return json({ error: "An unexpected error occurred while generating the QR token." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
