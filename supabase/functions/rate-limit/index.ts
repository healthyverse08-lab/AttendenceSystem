import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RateLimitBody {
  endpoint?: string;
  identifier?: string;
  limit?: number;
  windowSeconds?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Server misconfiguration.");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => null) as RateLimitBody | null;
    if (!body?.endpoint || !body?.identifier) {
      return json({ allowed: false, error: "endpoint and identifier are required." }, 400);
    }

    const limit = body.limit ?? 30;
    const windowSeconds = body.windowSeconds ?? 60;

    // Compute the current window start (aligned to window boundaries)
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();

    // Try to increment existing counter
    const { data: existing, error: selectErr } = await admin
      .from("rate_limit_tracking")
      .select("id, request_count")
      .eq("identifier", body.identifier)
      .eq("endpoint", body.endpoint)
      .eq("window_start", windowStart)
      .maybeSingle();

    if (selectErr) throw selectErr;

    if (existing) {
      const newCount = existing.request_count + 1;
      if (newCount > limit) {
        return json({ allowed: false, remaining: 0, limit, window: windowSeconds }, 429);
      }
      await admin
        .from("rate_limit_tracking")
        .update({ request_count: newCount })
        .eq("id", existing.id);
      return json({ allowed: true, remaining: limit - newCount, limit, window: windowSeconds }, 200);
    }

    // No existing record for this window — create one
    const { error: insertErr } = await admin.from("rate_limit_tracking").insert({
      identifier: body.identifier,
      endpoint: body.endpoint,
      window_start: windowStart,
      request_count: 1,
    });

    if (insertErr) {
      // Race condition: another request inserted first. Retry select.
      const { data: retry } = await admin
        .from("rate_limit_tracking")
        .select("id, request_count")
        .eq("identifier", body.identifier)
        .eq("endpoint", body.endpoint)
        .eq("window_start", windowStart)
        .maybeSingle();
      if (retry) {
        const newCount = retry.request_count + 1;
        if (newCount > limit) {
          return json({ allowed: false, remaining: 0, limit, window: windowSeconds }, 429);
        }
        await admin.from("rate_limit_tracking").update({ request_count: newCount }).eq("id", retry.id);
        return json({ allowed: true, remaining: limit - newCount, limit, window: windowSeconds }, 200);
      }
    }

    return json({ allowed: true, remaining: limit - 1, limit, window: windowSeconds }, 200);
  } catch (err) {
    console.error("rate-limit error:", err);
    return json({ allowed: true, error: "Rate limit check failed — allowing request." }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
