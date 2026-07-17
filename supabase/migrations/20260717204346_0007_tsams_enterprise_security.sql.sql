/*
# TSAMS — Enterprise Security, Audit & Rate Limiting

## Purpose
Strengthens the system with: enriched audit logs (role, description, device
info), immutable audit trail enforcement, rate-limit tracking infrastructure,
and new system settings for college branding.

## Changes

### 1. audit_logs — new columns
- `role` (text, nullable): the role of the actor at the time of the action.
- `description` (text, nullable): human-readable description of the action.
- `device_info` (jsonb, nullable): user-agent, platform, etc. of the actor.

### 2. audit_logs — immutability
- Add trigger `audit_logs_no_update` that prevents UPDATE and DELETE on
  audit_logs. Audit logs are append-only.
- Revoke UPDATE/DELETE from all roles via RLS (no policies for UPDATE/DELETE).

### 3. rate_limit_tracking — new table
- `id` uuid PK
- `identifier` text NOT NULL (user id or IP address)
- `endpoint` text NOT NULL (e.g. 'attendance-submit', 'qr-token')
- `window_start` timestamptz NOT NULL
- `request_count` int NOT NULL DEFAULT 1
- Unique constraint on (identifier, endpoint, window_start)
- This is the durable store for rate limiting since edge function instances
  do not share memory.

### 4. system_settings — new default settings
- `college_name` (default "Techspire College")
- `college_logo_url` (default null)
- `session_timeout_minutes` (default 60): auto session expiration
- `rate_limit_attendance_submit` (default 30): max attendance submissions per minute
- `rate_limit_qr_token` (default 60): max QR token requests per minute
- `rate_limit_login` (default 10): max login attempts per minute

## Security
- RLS enabled on rate_limit_tracking (service-role only via edge functions;
  no client policies needed — deny all direct client access).
- audit_logs: existing INSERT for authenticated + SELECT admin-only policies
  remain. No UPDATE/DELETE policies = immutable from client.
- Trigger prevents UPDATE/DELETE even with service role (defense in depth).

## Notes
- All changes are additive.
- Idempotent: uses IF NOT EXISTS / DO $$ blocks.
- No data is lost.
*/

-- ============================================================
-- 1. audit_logs: new columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN role text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN description text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
      AND column_name = 'device_info'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN device_info jsonb;
  END IF;
END $$;

-- ============================================================
-- 2. audit_logs immutability trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is immutable: UPDATE and DELETE are not allowed';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ============================================================
-- 3. rate_limit_tracking table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier
  ON public.rate_limit_tracking(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint
  ON public.rate_limit_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window
  ON public.rate_limit_tracking(window_start);

ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- No policies: deny all direct client access. Only service role (edge
-- functions) can read/write.

-- ============================================================
-- 4. system_settings: new security & branding settings
-- ============================================================
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('college_name', '"Techspire College"'::jsonb, 'Official college name displayed across the application.'),
  ('college_logo_url', 'null'::jsonb, 'URL to the college logo image.'),
  ('session_timeout_minutes', '60'::jsonb, 'Session auto-expiration timeout in minutes.'),
  ('rate_limit_attendance_submit', '30'::jsonb, 'Max attendance submissions per identifier per minute.'),
  ('rate_limit_qr_token', '60'::jsonb, 'Max QR token requests per identifier per minute.'),
  ('rate_limit_login', '10'::jsonb, 'Max login attempts per identifier per minute.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. Index on audit_logs for role + description lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_role
  ON public.audit_logs(role);
