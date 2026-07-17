import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SubmitBody {
  session_id?: string;
  qr_token?: string;
}

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

    // Domain check (defense in depth — also enforced in auth-session)
    if (!authUser.email?.toLowerCase().endsWith("@techspire.edu.np")) {
      return json({ error: "Access denied." }, 403);
    }

    const body = await req.json().catch(() => null) as SubmitBody | null;
    if (!body?.session_id || !body?.qr_token) {
      return json({ error: "session_id and qr_token are required." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Student record must exist and be active
    const { data: student } = await admin
      .from("students")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (!student) return json({ error: "You are not registered as a student." }, 403);
    if (student.status !== "active") return json({ error: `Your student status is ${student.status}.` }, 403);

    // 2. Attendance session must exist and be active
    const { data: session } = await admin
      .from("attendance_sessions")
      .select("*")
      .eq("id", body.session_id)
      .maybeSingle();
    if (!session) return json({ error: "Attendance session not found." }, 404);
    if (session.status !== "active") return json({ error: "Attendance session is not active." }, 409);

    // 3. Attendance window must be open
    const now = new Date();
    if (session.attendance_ends_at && new Date(session.attendance_ends_at) < now) {
      return json({ error: "Attendance window has closed." }, 409);
    }

    // 4. QR token must be valid, belong to this session, and not expired
    const { data: tokenRow } = await admin
      .from("qr_tokens")
      .select("*")
      .eq("token", body.qr_token)
      .eq("attendance_session_id", session.id)
      .maybeSingle();
    if (!tokenRow) return json({ error: "Invalid QR token." }, 401);
    if (new Date(tokenRow.expires_at) < now) return json({ error: "QR token has expired. Scan the latest code." }, 401);

    // 5. Student must belong to one of the selected sections
    const { data: sessionSections } = await admin
      .from("attendance_session_sections")
      .select("section_id")
      .eq("attendance_session_id", session.id);
    const sectionIds = (sessionSections ?? []).map((r: { section_id: string }) => r.section_id);
    if (!sectionIds.includes(student.section_id)) {
      return json({ error: "You are not in a section selected for this session." }, 403);
    }

    // 6. Student must be enrolled in the subject (via class assignment for their section)
    const { data: enrollment } = await admin
      .from("class_assignment_sections")
      .select("class_assignment_id")
      .eq("section_id", student.section_id)
      .maybeSingle();
    // If there's a class assignment covering this section + subject, it's valid.
    let enrolled = false;
    if (enrollment) {
      const { data: ca } = await admin
        .from("class_assignments")
        .select("id")
        .eq("id", enrollment.class_assignment_id)
        .eq("subject_id", session.subject_id)
        .eq("semester_id", session.semester_id)
        .maybeSingle();
      enrolled = !!ca;
    }
    if (!enrolled) {
      return json({ error: "You are not enrolled in this subject." }, 403);
    }

    // 7. Duplicate prevention — one attendance per student per session
    const { data: existing } = await admin
      .from("attendance_records")
      .select("id")
      .eq("attendance_session_id", session.id)
      .eq("student_id", student.id)
      .maybeSingle();
    if (existing) return json({ error: "You have already submitted attendance for this session." }, 409);

    // 8. Campus network validation (if enabled)
    const { data: netEnabledRow } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "campus_network_enabled")
      .maybeSingle();
    const netEnabled = netEnabledRow?.value === true;
    if (netEnabled) {
      const { data: rangesRow } = await admin
        .from("system_settings")
        .select("value")
        .eq("key", "approved_ip_ranges")
        .maybeSingle();
      const ranges = Array.isArray(rangesRow?.value) ? (rangesRow.value as { cidr: string }[]) : [];
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
      if (!clientIp) {
        return json({ error: "Unable to determine client IP address." }, 403);
      }
      if (ranges.length > 0 && !ranges.some((r) => ipInCidr(clientIp, r.cidr))) {
        return json({ error: "Attendance submitted outside approved campus network." }, 403);
      }
    }

    // Insert the attendance record (service role bypasses RLS)
    const { data: record, error: insertErr } = await admin
      .from("attendance_records")
      .insert({
        attendance_session_id: session.id,
        student_id: student.id,
        status: "present",
        qr_token: body.qr_token,
        submitted_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (insertErr) {
      // Unique constraint violation as a backstop duplicate check
      if (insertErr.code === "23505") {
        return json({ error: "You have already submitted attendance for this session." }, 409);
      }
      throw insertErr;
    }

    // Mark token consumed (single-use enforcement)
    await admin.from("qr_tokens").update({ consumed_at: new Date().toISOString() }).eq("id", tokenRow.id);

    return json({ success: true, record }, 201);
  } catch (err) {
    console.error("attendance-submit error:", err);
    return json({ error: "An unexpected error occurred while submitting attendance." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ipInCidr(ip: string, cidr: string): boolean {
  const ipParts = parseIpv4(ip);
  if (!ipParts) return false;
  const [base, prefixStr] = cidr.split("/");
  const baseParts = parseIpv4(base);
  const prefix = prefixStr !== undefined ? parseInt(prefixStr, 10) : 32;
  if (!baseParts || Number.isNaN(prefix) || prefix < 0 || prefix > 32) return false;
  const ipNum = ipv4ToInt(ipParts);
  const baseNum = ipv4ToInt(baseParts);
  const mask = prefix === 0 ? 0 : (-1 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (baseNum & mask);
}

function parseIpv4(ip: string): [number, number, number, number] | null {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return parts as [number, number, number, number];
}

function ipv4ToInt(parts: [number, number, number, number]): number {
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}
