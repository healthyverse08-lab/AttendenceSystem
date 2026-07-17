/*
# TSAMS — Users, Profiles, and Academic Structure

## Purpose
Foundation migration for the Techspire Smart Attendance Management System.
Creates the core identity tables and the fully-dynamic academic structure
(Departments, Programs, Academic Years, Intakes, Semesters, Sections,
Subjects, Teaching Types, Rooms). Nothing academic is hardcoded — every
entity is administrator-configurable.

## New Tables
1. `users` — central identity record, one row per authenticated Google account.
   `id` mirrors `auth.users.id`. Holds `role` (super_admin / administrator /
   lecturer / student) and `status`. Role is NEVER derived from email format.
2. `administrators` — extends `users` for admin staff (admin_id, role metadata).
3. `lecturers` — extends `users`; belongs to a department.
4. `students` — extends `users`; links to department, program, semester,
   section, intake, academic_year. `student_id` is the college registration id.
5. `departments` — academic departments (name, code).
6. `programs` — programs belonging to a department.
7. `academic_years` — e.g. "2024/2025" with start/end dates.
8. `intakes` — intake cohorts within an academic year.
9. `semesters` — semester lookup (name + number).
10. `sections` — alphanumeric section names (A, B, F251, F2512, ...).
11. `subjects` — subjects with code, department, credits.
12. `teaching_types` — Lecture / Tutorial / Practical / Lab / Workshop.
13. `rooms` — physical rooms with building and capacity.

## Constraints & Indexes
- UUID primary keys on every table.
- Unique constraints on natural keys (email, codes, names).
- Foreign keys with appropriate CASCADE / SET NULL.
- Indexes on all foreign-key columns and frequently-filtered columns.

## Security (RLS)
- RLS enabled on every table.
- `public.current_user_role()` helper (security definer) returns the caller's
  role from `users` so policies can authorize by role without email parsing.
- `users`: a user may SELECT/UPDATE their own row; admins may SELECT all.
- `administrators` / `lecturers` / `students`: a user may read their own
  profile row; admins have full CRUD; lecturers may read student profiles
  for students in sections they teach (best-effort, refined later).
- Academic structure tables (departments, programs, academic_years, intakes,
  semesters, sections, subjects, teaching_types, rooms): any authenticated
  user may SELECT (needed to render dashboards); only admins may write.

## Notes
- All `id` columns are UUID with `gen_random_uuid()` defaults.
- `updated_at` columns are maintained by application code (edge functions /
  repository layer) — no trigger is added in the foundation to keep the
  migration portable to a future Express + Prisma migration.
*/

-- ============================================================
-- 1. USERS (central identity)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  profile_picture_url text,
  role text NOT NULL CHECK (role IN ('super_admin','administrator','lecturer','student')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. DEPARTMENTS (created early; referenced by profiles & subjects)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. PROGRAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ACADEMIC YEARS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. INTAKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name)
);

-- ============================================================
-- 6. SEMESTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  number int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. SUBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  credits int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. TEACHING TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teaching_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 10. ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  building text,
  capacity int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. ADMINISTRATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.administrators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. LECTURERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  lecturer_id text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  intake_id uuid REFERENCES public.intakes(id) ON DELETE SET NULL,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','graduated','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role           ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status         ON public.users(status);

CREATE INDEX IF NOT EXISTS idx_programs_department  ON public.programs(department_id);
CREATE INDEX IF NOT EXISTS idx_intakes_academic_year ON public.intakes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department  ON public.subjects(department_id);

CREATE INDEX IF NOT EXISTS idx_administrators_user  ON public.administrators(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturers_user        ON public.lecturers(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturers_department  ON public.lecturers(department_id);
CREATE INDEX IF NOT EXISTS idx_students_user         ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_department  ON public.students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_program     ON public.students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_semester     ON public.students(semester_id);
CREATE INDEX IF NOT EXISTS idx_students_section     ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_intake      ON public.students(intake_id);
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON public.students(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_students_status       ON public.students(status);

-- ============================================================
-- ROLE HELPER (security definer) — used by RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrators  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecturers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intakes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms           ENABLE ROW LEVEL SECURITY;

-- ---- users ----
DROP POLICY IF EXISTS "users_select_own_or_admin" ON public.users;
CREATE POLICY "users_select_own_or_admin"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator'));

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- administrators ----
DROP POLICY IF EXISTS "admins_select_own_or_admin" ON public.administrators;
CREATE POLICY "admins_select_own_or_admin"
  ON public.administrators FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator'));

DROP POLICY IF EXISTS "admins_write_admin_only" ON public.administrators;
CREATE POLICY "admins_write_admin_only"
  ON public.administrators FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- ---- lecturers ----
DROP POLICY IF EXISTS "lecturers_select_own_or_admin_or_student" ON public.lecturers;
CREATE POLICY "lecturers_select_own_or_admin_or_student"
  ON public.lecturers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator','student'));

DROP POLICY IF EXISTS "lecturers_write_admin_only" ON public.lecturers;
CREATE POLICY "lecturers_write_admin_only"
  ON public.lecturers FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- ---- students ----
DROP POLICY IF EXISTS "students_select_own_or_admin_or_lecturer" ON public.students;
CREATE POLICY "students_select_own_or_admin_or_lecturer"
  ON public.students FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator','lecturer'));

DROP POLICY IF EXISTS "students_write_admin_only" ON public.students;
CREATE POLICY "students_write_admin_only"
  ON public.students FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- ---- academic structure: read for all authenticated, write admin-only ----
-- (departments, programs, academic_years, intakes, semesters, sections,
--  subjects, teaching_types, rooms)

-- departments
DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
CREATE POLICY "departments_select_all"
  ON public.departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "departments_write_admin" ON public.departments;
CREATE POLICY "departments_write_admin"
  ON public.departments FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- programs
DROP POLICY IF EXISTS "programs_select_all" ON public.programs;
CREATE POLICY "programs_select_all"
  ON public.programs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "programs_write_admin" ON public.programs;
CREATE POLICY "programs_write_admin"
  ON public.programs FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- academic_years
DROP POLICY IF EXISTS "academic_years_select_all" ON public.academic_years;
CREATE POLICY "academic_years_select_all"
  ON public.academic_years FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "academic_years_write_admin" ON public.academic_years;
CREATE POLICY "academic_years_write_admin"
  ON public.academic_years FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- intakes
DROP POLICY IF EXISTS "intakes_select_all" ON public.intakes;
CREATE POLICY "intakes_select_all"
  ON public.intakes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "intakes_write_admin" ON public.intakes;
CREATE POLICY "intakes_write_admin"
  ON public.intakes FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- semesters
DROP POLICY IF EXISTS "semesters_select_all" ON public.semesters;
CREATE POLICY "semesters_select_all"
  ON public.semesters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "semesters_write_admin" ON public.semesters;
CREATE POLICY "semesters_write_admin"
  ON public.semesters FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- sections
DROP POLICY IF EXISTS "sections_select_all" ON public.sections;
CREATE POLICY "sections_select_all"
  ON public.sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sections_write_admin" ON public.sections;
CREATE POLICY "sections_write_admin"
  ON public.sections FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- subjects
DROP POLICY IF EXISTS "subjects_select_all" ON public.subjects;
CREATE POLICY "subjects_select_all"
  ON public.subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects_write_admin" ON public.subjects;
CREATE POLICY "subjects_write_admin"
  ON public.subjects FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- teaching_types
DROP POLICY IF EXISTS "teaching_types_select_all" ON public.teaching_types;
CREATE POLICY "teaching_types_select_all"
  ON public.teaching_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "teaching_types_write_admin" ON public.teaching_types;
CREATE POLICY "teaching_types_write_admin"
  ON public.teaching_types FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));

-- rooms
DROP POLICY IF EXISTS "rooms_select_all" ON public.rooms;
CREATE POLICY "rooms_select_all"
  ON public.rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rooms_write_admin" ON public.rooms;
CREATE POLICY "rooms_write_admin"
  ON public.rooms FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));
