/*
# TSAMS — Dynamic QR Attendance Engine & Security Layer

## Purpose
Extends the attendance engine with: configurable QR rotation grace period,
manual attendance reason tracking, attendance session rotation count,
and audit logging support columns.

## Changes

### 1. system_settings — new default settings
- `qr_grace_period_seconds` (default 3): seconds after token expiry during
  which the immediately previous token is still accepted. Configurable by admin.
- `attendance_min_duration_seconds` (default 120): minimum attendance window.
- `attendance_max_duration_seconds` (default 5400): maximum attendance window (90 min).

### 2. attendance_sessions — new column
- `rotation_count` (int, default 0): incremented each time a new QR token is
  generated for this session. Helps lecturers see how many rotations occurred.

### 3. attendance_records — new column
- `manual_reason` (text, nullable): optional reason supplied by lecturer when
  recording manual attendance.
- `recorded_by` (uuid, nullable, FK -> users): the user who recorded this
  attendance (the student themselves via QR scan, or the lecturer for manual).
- `is_manual` (boolean, default false): true when attendance was manually
  recorded by a lecturer rather than via QR scan.

### 4. audit_logs — index on created_at
  (already exists from migration 0002, no change needed)

## Security
- No new tables. RLS already enabled on attendance_sessions, attendance_records,
  and system_settings from prior migrations.
- New columns inherit existing RLS policies.
- `recorded_by` FK references users(id) ON DELETE SET NULL.

## Notes
- All changes are additive (ALTER TABLE ADD COLUMN / INSERT settings).
- Idempotent: uses DO $$ ... IF NOT EXISTS blocks.
- No data is lost; no columns are dropped or renamed.
*/

-- ============================================================
-- 1. attendance_sessions: rotation_count column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
      AND column_name = 'rotation_count'
  ) THEN
    ALTER TABLE public.attendance_sessions
      ADD COLUMN rotation_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 2. attendance_records: manual_reason, recorded_by, is_manual
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_records'
      AND column_name = 'manual_reason'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD COLUMN manual_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_records'
      AND column_name = 'recorded_by'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD COLUMN recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_records'
      AND column_name = 'is_manual'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD COLUMN is_manual boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 3. system_settings: new engine configuration keys
-- ============================================================
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('qr_grace_period_seconds', '3'::jsonb, 'Grace period in seconds after QR token expiry during which the previous token is still accepted.'),
  ('attendance_min_duration_seconds', '120'::jsonb, 'Minimum configurable attendance window duration in seconds.'),
  ('attendance_max_duration_seconds', '5400'::jsonb, 'Maximum configurable attendance window duration in seconds (90 minutes).')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 4. Index for recorded_by lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_records_recorded_by
  ON public.attendance_records(recorded_by);

CREATE INDEX IF NOT EXISTS idx_attendance_records_is_manual
  ON public.attendance_records(is_manual)
  WHERE is_manual = true;