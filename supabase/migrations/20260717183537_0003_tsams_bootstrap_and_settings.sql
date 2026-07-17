/*
# TSAMS — Bootstrap Super Admin, Default Settings, and Audit Trigger

## Purpose
Third foundation migration. Seeds the bootstrap Super Administrator email,
inserts default system settings, and adds an audit trigger helper.

## Changes
1. Seed `system_settings` defaults (idempotent via ON CONFLICT):
   - `qr_rotation_seconds` = 10
   - `attendance_duration_seconds` = 120
   - `campus_network_enabled` = false (disabled until admin configures IP ranges)
   - `approved_ip_ranges` = [] (empty array; admin configures later)
   - `bootstrap_mode` = true (auto-disabled after first super admin login —
     handled by the `auth-session` edge function)
   - `allowed_email_domain` = "techspire.edu.np"
2. Seed a bootstrap super admin user record. NOTE: the `users.id` must match
   a real `auth.users.id` — we cannot create the auth.users row from here.
   Instead, we store the bootstrap email in `system_settings` under
   `bootstrap_super_admin_email`. The `auth-session` edge function reads this
   value on first login, creates the `users` row with role = 'super_admin',
   then sets `bootstrap_mode` = false.
3. `updated_at` trigger function + triggers on all tables with `updated_at`.
   This keeps `updated_at` accurate without app-side code and survives a
   future Express + Prisma migration (Prisma can call the same column).

## Security
- No new RLS policies. Settings writes remain admin-only (from 0002).
- The trigger function is SECURITY DEFINER so it can run on any table
  regardless of the caller's role.

## Notes
- Replace the placeholder bootstrap email below with the real Techspire
  college account before first login. The `auth-session` edge function
  will promote the first matching login to super_admin and disable
  bootstrap mode permanently.
*/

-- ============================================================
-- 1. DEFAULT SYSTEM SETTINGS
-- ============================================================
INSERT INTO public.system_settings (key, value, description) VALUES
  ('qr_rotation_seconds', '10', 'How long each QR token stays valid (seconds).'),
  ('attendance_duration_seconds', '120', 'Default attendance window length (seconds).'),
  ('campus_network_enabled', 'false', 'Whether campus IP-range validation is enforced.'),
  ('approved_ip_ranges', '[]', 'Approved CIDR IP ranges for campus network validation.'),
  ('bootstrap_mode', 'true', 'Whether bootstrap super-admin promotion is still allowed.'),
  ('allowed_email_domain', '"techspire.edu.np"', 'Only emails from this domain may sign in.'),
  ('bootstrap_super_admin_email', '"admin@techspire.edu.np"', 'First login with this email becomes Super Administrator.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tables_with_updated_at text[] := ARRAY[
    'users','administrators','lecturers','students',
    'departments','programs','academic_years','intakes','semesters',
    'sections','subjects','teaching_types','rooms',
    'class_assignments','attendance_sessions',
    'leave_applications','system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_updated_at LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I; CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END $$;