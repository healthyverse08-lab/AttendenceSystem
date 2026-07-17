/*
# TSAMS — QR Token Store

## Purpose
Durable storage for rotating QR tokens. Edge function instances do NOT
share memory, so QR tokens must live in the database to be validatable by
any instance. This is the "Persisting State" rule from the skill applied.

## New Table
- `qr_tokens`
  - `id` uuid PK
  - `attendance_session_id` uuid FK -> attendance_sessions(id) CASCADE
  - `token` text NOT NULL UNIQUE
  - `issued_at` timestamptz NOT NULL
  - `expires_at` timestamptz NOT NULL
  - `consumed_at` timestamptz NULL (set when a student uses it, to allow
    single-use enforcement if desired)

## Indexes
- on attendance_session_id (lookup tokens for a session)
- on token (validation lookup)
- on expires_at (cleanup)

## Security (RLS)
- RLS enabled.
- SELECT/INSERT for authenticated (the qr-token edge function uses the
  service role and bypasses RLS; this policy is a backstop for any direct
  client access and to allow the owning lecturer to read active tokens if
  needed in future prompts).
- DELETE admin-only (cleanup).
*/

CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_session ON public.qr_tokens(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token   ON public.qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires  ON public.qr_tokens(expires_at);

ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qr_tokens_select_auth" ON public.qr_tokens;
CREATE POLICY "qr_tokens_select_auth"
  ON public.qr_tokens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "qr_tokens_insert_auth" ON public.qr_tokens;
CREATE POLICY "qr_tokens_insert_auth"
  ON public.qr_tokens FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "qr_tokens_update_auth" ON public.qr_tokens;
CREATE POLICY "qr_tokens_update_auth"
  ON public.qr_tokens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "qr_tokens_delete_admin" ON public.qr_tokens;
CREATE POLICY "qr_tokens_delete_admin"
  ON public.qr_tokens FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'));