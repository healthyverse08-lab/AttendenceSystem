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
    if (!isOwner) {
      await auditLog(admin, authUser.id, "unauthorized_qr_attempt", "attendance_sessions", session.id, { reason: "not_session_owner" }, req);
      return json({ error: "Forbidden." }, 403);
    }

    // Load rotation + grace period settings
    const { data: settingsRows } = await admin
      .from("system_settings")
      .select("key, value")
      .in("key", ["qr_rotation_seconds", "qr_grace_period_seconds"]);
    const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const rotationSeconds = Number(settings.qr_rotation_seconds ?? session.qr_rotation_seconds ?? 10);
    const gracePeriodSeconds = Number(settings.qr_grace_period_seconds ?? 3);

    // Expire all previous active tokens for this session (previous QR invalid)
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    await admin
      .from("qr_tokens")
      .update({ expires_at: nowIso })
      .eq("attendance_session_id", session.id)
      .is("consumed_at", null)
      .gt("expires_at", nowIso);

    // Generate a fresh token. Stored in a durable table (qr_tokens) so any
    // edge instance can validate it — module-level state is NOT shared.
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(now + rotationSeconds * 1000).toISOString();

    const { error: insertErr } = await admin.from("qr_tokens").insert({
      attendance_session_id: session.id,
      token,
      issued_at: nowIso,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    // Increment rotation count on session
    await admin
      .from("attendance_sessions")
      .update({ rotation_count: (session.rotation_count ?? 0) + 1, updated_at: nowIso })
      .eq("id", session.id);

    // Audit log: QR generated/rotated
    const action = (session.rotation_count ?? 0) === 0 ? "qr_generated" : "qr_rotated";
    await auditLog(admin, authUser.id, action, "attendance_sessions", session.id, {
      rotation_seconds: rotationSeconds,
      grace_period_seconds: gracePeriodSeconds,
      rotation_number: (session.rotation_count ?? 0) + 1,
    }, req);

    return json(
      {
        session_id: session.id,
        token,
        expires_at: expiresAt,
        rotation_seconds: rotationSeconds,
        grace_period_seconds: gracePeriodSeconds,
        rotation_number: (session.rotation_count ?? 0) + 1,
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

async function auditLog(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata: Record<string, unknown>,
  req: Request
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ip_address: ip,
  });
}
