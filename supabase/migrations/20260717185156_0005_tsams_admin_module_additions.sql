/*
# TSAMS — Admin Module Schema Additions

## Purpose
Adds columns needed by the Administrator Module (Prompt 2) without touching
the existing schema. All additions are additive (ALTER TABLE ADD COLUMN)
and idempotent — safe to re-run.

## Changes
1. `students.deleted_at` (timestamptz, nullable) — soft-delete support.
   A non-null value marks the student as archived; the UI filters these
   out unless "archived" view is selected. No data is lost.
2. `lecturers.employment_status` (text, default 'active') —
   active / inactive / archived / on_leave.
3. `lecturers.deleted_at` (timestamptz, nullable) — soft-delete for lecturers.
4. `subjects.program_id` (uuid, nullable, FK -> programs) — a subject may
   belong to a program (in addition to department).
5. `subjects.semester_id` (uuid, nullable, FK -> semesters) — a subject may
   be associated with a semester.
6. `subjects.deleted_at` (timestamptz, nullable) — soft-delete for subjects.
7. `departments.deleted_at`, `programs.deleted_at`, `academic_years.deleted_at`,
   `intakes.deleted_at`, `semesters.deleted_at`, `sections.deleted_at`,
   `teaching_types.deleted_at`, `rooms.deleted_at` — soft-delete columns
   for all academic-structure entities.
8. `class_assignments.deleted_at` — soft-delete for class assignments.
9. Indexes on `deleted_at` for efficient active/archived filtering.
10. New system settings seeds: `college_name`, `college_logo_url`,
    `attendance_warning_thresholds`.

## Security
- No new RLS policies needed; existing policies cover the new columns.
- Soft-deleted rows remain visible to admins (who have write policy access)
  and are filtered in application queries.

## Notes
- `deleted_at` is nullable by default, so existing rows are unaffected.
- Soft-delete is preferred over hard delete to preserve attendance history
  integrity (a student's past attendance references their `students.id`).
*/

-- students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- lecturers
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS employment_status text NOT NULL DEFAULT 'active'
  CHECK (employment_status IN ('active','inactive','archived','on_leave'));
ALTER TABLE public.lecturers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_lecturers_deleted_at ON public.lecturers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lecturers_employment_status ON public.lecturers(employment_status);

-- subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_subjects_program_id ON public.subjects(program_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON public.subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_deleted_at ON public.subjects(deleted_at);

-- academic structure soft-delete columns
ALTER TABLE public.departments     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.programs       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.academic_years  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.intakes         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.semesters       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sections        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.teaching_types  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.rooms           ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.class_assignments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_departments_deleted_at    ON public.departments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_programs_deleted_at      ON public.programs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_academic_years_deleted_at ON public.academic_years(deleted_at);
CREATE INDEX IF NOT EXISTS idx_intakes_deleted_at        ON public.intakes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_semesters_deleted_at      ON public.semesters(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sections_deleted_at       ON public.sections(deleted_at);
CREATE INDEX IF NOT EXISTS idx_teaching_types_deleted_at ON public.teaching_types(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at          ON public.rooms(deleted_at);
CREATE INDEX IF NOT EXISTS idx_class_assignments_deleted_at ON public.class_assignments(deleted_at);

-- New system settings seeds
INSERT INTO public.system_settings (key, value, description) VALUES
  ('college_name', '"Techspire College"', 'Display name of the college.'),
  ('college_logo_url', 'null', 'URL to the college logo image.'),
  ('attendance_warning_thresholds',
   '{"excellent":80,"good":70,"warning":50,"critical":0}',
   'Attendance percentage thresholds for color bands.')
ON CONFLICT (key) DO NOTHING;
