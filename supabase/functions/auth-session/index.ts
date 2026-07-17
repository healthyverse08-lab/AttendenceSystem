import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAIN = "techspire.edu.np";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server misconfiguration: missing Supabase credentials.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header." }, 401);
    }

    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
    const deviceInfo = { user_agent: userAgent, ip: clientIp };

    // Client that runs AS the user (respects RLS) to resolve the auth user.
    const userClient = createClient(supabaseUrl, anonKey ?? serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized." }, 401);
    }
    const authUser = userData.user;
    const email = authUser.email ?? "";

    // Domain restriction — only @techspire.edu.np
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      await auditLogAdmin(supabaseUrl, serviceRoleKey, authUser.id, null, "login_denied", "users", authUser.id, { reason: "invalid_email_domain", email }, deviceInfo);
      return json({ error: "Access denied. Use an official Techspire College Google Account." }, 403);
    }

    // Admin/service client (bypasses RLS) for bootstrap + user upsert.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Load settings (bootstrap mode + bootstrap email)
    const { data: settingsRows } = await admin
      .from("system_settings")
      .select("key, value")
      .in("key", ["bootstrap_mode", "bootstrap_super_admin_email", "allowed_email_domain"]);
    const settings = Object.fromEntries((settingsRows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
    const bootstrapMode = settings.bootstrap_mode === true;
    const bootstrapEmail = String(settings.bootstrap_super_admin_email ?? "").toLowerCase();

    // Look up existing user record
    let { data: userRow } = await admin
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    // Bootstrap promotion: first login with seeded email becomes super_admin,
    // then bootstrap mode is permanently disabled.
    if (!userRow && bootstrapMode && email.toLowerCase() === bootstrapEmail) {
      const { data: created, error: createErr } = await admin
        .from("users")
        .insert({
          id: authUser.id,
          email,
          full_name: authUser.user_metadata?.full_name ?? email,
          profile_picture_url: authUser.user_metadata?.avatar_url ?? null,
          role: "super_admin",
          status: "active",
        })
        .select("*")
        .single();
      if (createErr) throw createErr;
      userRow = created;
      await admin.from("system_settings").update({ value: false }).eq("key", "bootstrap_mode");
      await admin.from("audit_logs").insert({
        actor_id: authUser.id,
        action: "bootstrap_super_admin_promoted",
        entity_type: "users",
        entity_id: authUser.id,
        metadata: { email },
        ip_address: clientIp,
        device_info: deviceInfo,
      });
    }

    if (!userRow) {
      await auditLogAdmin(supabaseUrl, serviceRoleKey, authUser.id, null, "login_denied", "users", authUser.id, { reason: "not_registered", email }, deviceInfo);
      return json({ error: "You are not registered in TSAMS. Contact an administrator." }, 403);
    }

    if (userRow.status !== "active") {
      await auditLogAdmin(supabaseUrl, serviceRoleKey, authUser.id, userRow.role, "login_denied", "users", authUser.id, { reason: `account_${userRow.status}`, email }, deviceInfo);
      return json({ error: `Your account is ${userRow.status}. Contact an administrator.` }, 403);
    }

    // Sync profile picture / name from Google metadata if changed
    const newName = authUser.user_metadata?.full_name ?? userRow.full_name;
    const newPic = authUser.user_metadata?.avatar_url ?? userRow.profile_picture_url;
    if (newName !== userRow.full_name || newPic !== userRow.profile_picture_url) {
      await admin
        .from("users")
        .update({ full_name: newName, profile_picture_url: newPic })
        .eq("id", authUser.id);
      userRow.full_name = newName;
      userRow.profile_picture_url = newPic;
    }

    // Load role-specific profile
    let profile = null;
    if (userRow.role === "administrator" || userRow.role === "super_admin") {
      profile = (await admin.from("administrators").select("*").eq("user_id", authUser.id).maybeSingle()).data;
    } else if (userRow.role === "lecturer") {
      profile = (await admin.from("lecturers").select("*").eq("user_id", authUser.id).maybeSingle()).data;
    } else if (userRow.role === "student") {
      profile = (await admin.from("students").select("*").eq("user_id", authUser.id).maybeSingle()).data;
    }

    // Audit log: successful login
    await admin.from("audit_logs").insert({
      actor_id: authUser.id,
      role: userRow.role,
      action: "user_login",
      description: `${userRow.full_name} (${userRow.role}) signed in`,
      entity_type: "users",
      entity_id: authUser.id,
      metadata: { email, role: userRow.role },
      ip_address: clientIp,
      device_info: deviceInfo,
    });

    return json({ user: userRow, role: userRow.role, profile }, 200);
  } catch (err) {
    console.error("auth-session error:", err);
    return json({ error: "An unexpected error occurred while loading your session." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function auditLogAdmin(
  supabaseUrl: string,
  serviceRoleKey: string,
  actorId: string,
  role: string | null,
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata: Record<string, unknown>,
  deviceInfo: Record<string, unknown>
) {
  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);
    await admin.from("audit_logs").insert({
      actor_id: actorId,
      role,
      action,
      description: `Login attempt denied: ${metadata.reason ?? 'unknown'}`,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      ip_address: deviceInfo.ip ?? null,
      device_info: deviceInfo,
    });
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
}
