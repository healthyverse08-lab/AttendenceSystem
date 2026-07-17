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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY");

  try {
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server misconfiguration.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header." }, 401);

    const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized." }, 401);
    const authUser = userData.user;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Email domain must be @techspire.edu.np
    if (!authUser.email?.toLowerCase().endsWith("@techspire.edu.np")) {
      await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", null, null, { reason: "invalid_email_domain", email: authUser.email }, req);
      return json({ error: "Access denied. Use an official Techspire College account." }, 403);
    }

    const body = await req.json().catch(() => null) as SubmitBody | null;
    if (!body?.session_id || !body?.qr_token) {
      return json({ error: "session_id and qr_token are required." }, 400);
    }

    // 2. Student record must exist and be active
    const { data: student } = await admin
      .from("students")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();
    if (!student) {
      await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", body.session_id, { reason: "not_a_student" }, req);
      return json({ error: "You are not registered as a student." }, 403);
    }
    if (student.status !== "active") {
      await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", body.session_id, { reason: "inactive_student", status: student.status }, req);
      return json({ error: `Your student status is ${student.status}.` }, 403);
    }

    // 3. Attendance session must exist and be active
    const { data: session } = await admin
      .from("attendance_sessions")
      .select("*")
      .eq("id", body.session_id)
      .maybeSingle();
    if (!session) {
      await auditLog(admin, authUser.id, "invalid_session_attempt", "attendance_sessions", body.session_id, { reason: "session_not_found" }, req);
      return json({ error: "Attendance session not found." }, 404);
    }
    if (session.status !== "active") {
      await auditLog(admin, authUser.id, "invalid_session_attempt", "attendance_sessions", session.id, { reason: "session_not_active", status: session.status }, req);
      return json({ error: "Attendance session is not active." }, 409);
    }

    // 4. Attendance window must be open
    const now = new Date();
    if (session.attendance_ends_at && new Date(session.attendance_ends_at) < now) {
      await auditLog(admin, authUser.id, "attendance_closed_attempt", "attendance_sessions", session.id, { reason: "window_closed" }, req);
      return json({ error: "Attendance window has closed." }, 409);
    }

    // 5. QR token validation with grace period
    const { data: settingsRows } = await admin
      .from("system_settings")
      .select("key, value")
      .in("key", ["qr_grace_period_seconds"]);
    const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const gracePeriodSeconds = Number(settings.qr_grace_period_seconds ?? 3);

    const { data: tokenRow } = await admin
      .from("qr_tokens")
      .select("*")
      .eq("token", body.qr_token)
      .eq("attendance_session_id", session.id)
      .maybeSingle();
    if (!tokenRow) {
      await auditLog(admin, authUser.id, "invalid_token_attempt", "attendance_sessions", session.id, { reason: "token_not_found" }, req);
      return json({ error: "Invalid QR token." }, 401);
    }

    const tokenExpiry = new Date(tokenRow.expires_at);
    const expiryWithGrace = new Date(tokenExpiry.getTime() + gracePeriodSeconds * 1000);
    if (now > expiryWithGrace) {
      await auditLog(admin, authUser.id, "invalid_token_attempt", "attendance_sessions", session.id, { reason: "token_expired", expired_at: tokenRow.expires_at }, req);
      return json({ error: "QR token has expired. Scan the latest code." }, 401);
    }

    // 6. Student must belong to one of the selected sections
    const { data: sessionSections } = await admin
      .from("attendance_session_sections")
      .select("section_id")
      .eq("attendance_session_id", session.id);
    const sectionIds = (sessionSections ?? []).map((r: { section_id: string }) => r.section_id);
    if (!sectionIds.includes(student.section_id)) {
      await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", session.id, { reason: "wrong_section", student_section: student.section_id }, req);
      return json({ error: "You are not in a section selected for this session." }, 403);
    }

    // 7. Student must be enrolled in the subject (via class assignment for their section)
    const { data: enrollment } = await admin
      .from("class_assignment_sections")
      .select("class_assignment_id")
      .eq("section_id", student.section_id)
      .maybeSingle();
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
      await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", session.id, { reason: "not_enrolled" }, req);
      return json({ error: "You are not enrolled in this subject." }, 403);
    }

    // 8. Duplicate prevention — application level
    const { data: existing } = await admin
      .from("attendance_records")
      .select("id")
      .eq("attendance_session_id", session.id)
      .eq("student_id", student.id)
      .maybeSingle();
    if (existing) {
      await auditLog(admin, authUser.id, "duplicate_attendance_attempt", "attendance_sessions", session.id, { student_id: student.id }, req);
      return json({ error: "Attendance has already been recorded." }, 409);
    }

    // 9. Campus network validation (if enabled)
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
      if (!clientIp) {
        await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", session.id, { reason: "no_client_ip" }, req);
        return json({ error: "Unable to determine client IP address." }, 403);
      }
      if (ranges.length > 0 && !ranges.some((r) => ipInCidr(clientIp, r.cidr))) {
        await auditLog(admin, authUser.id, "unauthorized_attendance_attempt", "attendance_sessions", session.id, { reason: "outside_campus_network", ip: clientIp }, req);
        return json({ error: "Attendance submitted outside approved campus network." }, 403);
      }
    }

    // 10. Insert attendance record (service role bypasses RLS)
    const { data: record, error: insertErr } = await admin
      .from("attendance_records")
      .insert({
        attendance_session_id: session.id,
        student_id: student.id,
        status: "present",
        qr_token: body.qr_token,
        submitted_at: new Date().toISOString(),
        submitted_ip: clientIp,
        recorded_by: authUser.id,
        is_manual: false,
      })
      .select("*")
      .single();
    if (insertErr) {
      if (insertErr.code === "23505") {
        await auditLog(admin, authUser.id, "duplicate_attendance_attempt", "attendance_sessions", session.id, { student_id: student.id, reason: "db_constraint" }, req);
        return json({ error: "Attendance has already been recorded." }, 409);
      }
      throw insertErr;
    }

    // Mark token consumed
    await admin.from("qr_tokens").update({ consumed_at: new Date().toISOString() }).eq("id", tokenRow.id);

    // Audit log: attendance recorded
    await auditLog(admin, authUser.id, "attendance_recorded", "attendance_sessions", session.id, {
      student_id: student.id,
      record_id: record.id,
      subject_id: session.subject_id,
    }, req);

    // Fetch subject name for the response
    const { data: subjectRow } = await admin
      .from("subjects")
      .select("name, code")
      .eq("id", session.subject_id)
      .maybeSingle();

    return json({
      success: true,
      record,
      session_details: {
        subject_name: subjectRow?.name ?? "Session",
        subject_code: subjectRow?.code ?? "",
        session_id: session.id,
        internal_session_id: session.internal_session_id,
        start_time: session.start_time,
        recorded_at: record.submitted_at,
      },
    }, 201);
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
