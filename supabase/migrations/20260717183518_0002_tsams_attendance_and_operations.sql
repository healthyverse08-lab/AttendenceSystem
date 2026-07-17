/*
# TSAMS — Class Assignments, Attendance, Notifications, Leave, Audit, Settings

## Purpose
Second foundation migration. Adds the operational tables that sit on top of
the identity + academic structure created in 0001.

## New Tables
1. `class_assignments` — defines "who teaches what to whom".
   Links subject, semester, teaching_type, lecturer, and many sections
   (via `class_assignment_sections` join table). One lecturer can teach
   multiple subjects, semesters, sections, and teaching types.
2. `class_assignment_sections` — many-to-many between assignments and sections.
3. `attendance_sessions` — a "teaching session" created by a lecturer before
   attendance begins. Holds subject, teaching_type, selected sections,
   start/end time, optional comments (room, topic, notes, remarks), and an
   internal unique session_id. Tracks QR rotation, attendance duration,
   and current status (draft / active / ended / cancelled).
4. `attendance_session_sections` — many-to-many between sessions and sections.
5. `attendance_records` — one row per student per session. Unique constraint
   on (attendance_session_id, student_id) enforces "one attendance per
   student per session" at the database level (duplicate prevention).
6. `notifications` — foundation table for in-app notifications.
7. `leave_applications` — student/lecturer leave requests.
8. `audit_logs` — append-only audit trail of sensitive actions.
9. `system_settings` — key/value configuration (qr_rotation_seconds,
   attendance_duration_seconds, campus_network_enabled, approved_ip_ranges,
   bootstrap_mode, etc.). Single-row pattern enforced later by app logic.

## Constraints & Indexes
- UUID primary keys.
- Unique constraint on `attendance_records(attendance_session_id, student_id)`.
- FK indexes on all join columns.
- Indexes on status / created_at for session filtering.

## Security (RLS)
- RLS enabled on all new tables.
- `class_assignments`: SELECT for authenticated; write for admin + owning lecturer.
- `class_assignment_sections`: SELECT authenticated; write admin + owning lecturer.
- `attendance_sessions`: SELECT for admin, owning lecturer, and students in
  selected sections (via EXISTS subquery on class_assignment_sections /
  student's section); INSERT/UPDATE for owning lecturer + admin; DELETE admin.
- `attendance_session_sections`: SELECT authenticated; write owning lecturer + admin.
- `attendance_records`: SELECT for admin, owning lecturer, and the student
  themselves; INSERT for authenticated students (validated server-side in
  edge function) — RLS here is a backstop; the authoritative validation
  (QR token, section membership, enrollment, duplicate, network) runs in
  the `attendance-submit` edge function with the service role key.
- `notifications`: owner-scoped (user_id).
- `leave_applications`: owner-scoped for students/lecturers; admin read-all.
- `audit_logs`: INSERT for authenticated; SELECT admin-only.
- `system_settings`: SELECT authenticated; write admin-only.

## Notes
- The service-role key used by edge functions bypasses RLS, so the
  attendance validation logic is authoritative in the edge function.
  RLS policies here protect direct client reads/writes as a defense in depth.
*/

-- ============================================================
-- 1. CLASS ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  teaching_type_id uuid NOT NULL REFERENCES public.teaching_types(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_assignment_sections (
  class_assignment_id uuid NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  PRIMARY KEY (class_assignment_id, section_id)
);

-- ============================================================
-- 2. ATTENDANCE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_session_id text NOT NULL UNIQUE,
  class_assignment_id uuid NOT NULL REFERENCES public.class_assignments(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teaching_type_id uuid NOT NULL REFERENCES public.teaching_types(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  comments text,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended','cancelled')),
  qr_rotation_seconds int NOT NULL DEFAULT 10,
  attendance_duration_seconds int NOT NULL DEFAULT 120,
  attendance_started_at timestamptz,
  attendance_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_session_sections (
  attendance_session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  PRIMARY KEY (attendance_session_id, section_id)
);

-- ============================================================
-- 3. ATTENDANCE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  qr_token text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attendance_session_id, student_id)
);

-- ============================================================
-- 4. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success','attendance','leave','system')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. LEAVE APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  applicant_role text NOT NULL CHECK (applicant_role IN ('student','lecturer')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_class_assignments_subject     ON public.class_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_semester     ON public.class_assignments(semester_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_teaching_type ON public.class_assignments(teaching_type_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_lecturer     ON public.class_assignments(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_class_assignments_academic_year ON public.class_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_assignment_sections_section ON public.class_assignment_sections(section_id);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lecturer   ON public.attendance_sessions(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_subject   ON public.attendance_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status     ON public.attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_start_time ON public.attendance_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_assignment ON public.attendance_sessions(class_assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_sections_section ON public.attendance_session_sections(section_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session    ON public.attendance_records(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student     ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status      ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_submitted_at ON public.attendance_records(submitted_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user            ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read        ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at     ON public.notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_leave_applications_applicant ON public.leave_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status    ON public.leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_created_at ON public.leave_applications(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor             ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action            ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity            ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at        ON public.audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_settings_key          ON public.system_settings(key);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.class_assignments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_assignment_sections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_session_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings             ENABLE ROW LEVEL SECURITY;

-- ---- class_assignments ----
DROP POLICY IF EXISTS "class_assignments_select_auth" ON public.class_assignments;
CREATE POLICY "class_assignments_select_auth"
  ON public.class_assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "class_assignments_write_admin_or_lecturer" ON public.class_assignments;
CREATE POLICY "class_assignments_write_admin_or_lecturer"
  ON public.class_assignments FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR lecturer_id IN (SELECT id FROM public.lecturers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin','administrator')
    OR lecturer_id IN (SELECT id FROM public.lecturers WHERE user_id = auth.uid())
  );

-- ---- class_assignment_sections ----
DROP POLICY IF EXISTS "class_assignment_sections_select_auth" ON public.class_assignment_sections;
CREATE POLICY "class_assignment_sections_select_auth"
  ON public.class_assignment_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "class_assignment_sections_write_admin_or_lecturer" ON public.class_assignment_sections;
CREATE POLICY "class_assignment_sections_write_admin_or_lecturer"
  ON public.class_assignment_sections FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR class_assignment_id IN (
      SELECT ca.id FROM public.class_assignments ca
      JOIN public.lecturers l ON l.id = ca.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin','administrator')
    OR class_assignment_id IN (
      SELECT ca.id FROM public.class_assignments ca
      JOIN public.lecturers l ON l.id = ca.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  );

-- ---- attendance_sessions ----
DROP POLICY IF EXISTS "attendance_sessions_select_auth" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_select_auth"
  ON public.attendance_sessions FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR lecturer_id IN (SELECT id FROM public.lecturers WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.attendance_session_sections ass
      JOIN public.students s ON s.section_id = ass.section_id
      WHERE ass.attendance_session_id = attendance_sessions.id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "attendance_sessions_write_lecturer_or_admin" ON public.attendance_sessions;
CREATE POLICY "attendance_sessions_write_lecturer_or_admin"
  ON public.attendance_sessions FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR lecturer_id IN (SELECT id FROM public.lecturers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin','administrator')
    OR lecturer_id IN (SELECT id FROM public.lecturers WHERE user_id = auth.uid())
  );

-- ---- attendance_session_sections ----
DROP POLICY IF EXISTS "attendance_session_sections_select_auth" ON public.attendance_session_sections;
CREATE POLICY "attendance_session_sections_select_auth"
  ON public.attendance_session_sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_session_sections_write_lecturer_or_admin" ON public.attendance_session_sections;
CREATE POLICY "attendance_session_sections_write_lecturer_or_admin"
  ON public.attendance_session_sections FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin','administrator')
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  );

-- ---- attendance_records ----
-- SELECT: admin, owning lecturer, or the student themselves.
DROP POLICY IF EXISTS "attendance_records_select_auth" ON public.attendance_records;
CREATE POLICY "attendance_records_select_auth"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  );

-- INSERT: authenticated students submit their own attendance; server-side
-- validation (QR token, section, enrollment, duplicate, network) runs in the
-- edge function with the service role key. RLS is a backstop here.
DROP POLICY IF EXISTS "attendance_records_insert_own" ON public.attendance_records;
CREATE POLICY "attendance_records_insert_own"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- UPDATE/DELETE: admin or owning lecturer only.
DROP POLICY IF EXISTS "attendance_records_update_admin_or_lecturer" ON public.attendance_records;
CREATE POLICY "attendance_records_update_admin_or_lecturer"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_role() IN ('super_admin','administrator')
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "attendance_records_delete_admin_or_lecturer" ON public.attendance_records;
CREATE POLICY "attendance_records_delete_admin_or_lecturer"
  ON public.attendance_records FOR DELETE TO authenticated
  USING (
    public.current_user_role() IN ('super_admin','administrator')
    OR attendance_session_id IN (
      SELECT as2.id FROM public.attendance_sessions as2
      JOIN public.lecturers l ON l.id = as2.lecturer_id
      WHERE l.user_id = auth.uid()
    )
  );

-- ---- notifications ----
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---- leave_applications ----
DROP POLICY IF EXISTS "leave_applications_select_own_or_admin" ON public.leave_applications;
CREATE POLICY "leave_applications_select_own_or_admin"
  ON public.leave_applications FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator'));

DROP POLICY IF EXISTS "leave_applications_insert_own" ON public.leave_applications;
CREATE POLICY "leave_applications_insert_own"
  ON public.leave_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "leave_applications_update_own_or_admin" ON public.leave_applications;
CREATE POLICY "leave_applications_update_own_or_admin"
  ON public.leave_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (applicant_id = auth.uid() OR public.current_user_role() IN ('super_admin','administrator'));

-- ---- audit_logs ----
DROP POLICY IF EXISTS "audit_logs_insert_auth" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_auth"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'));

-- ---- system_settings ----
DROP POLICY IF EXISTS "system_settings_select_auth" ON public.system_settings;
CREATE POLICY "system_settings_select_auth"
  ON public.system_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_settings_write_admin" ON public.system_settings;
CREATE POLICY "system_settings_write_admin"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('super_admin','administrator'))
  WITH CHECK (public.current_user_role() IN ('super_admin','administrator'));