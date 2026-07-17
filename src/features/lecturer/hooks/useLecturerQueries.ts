import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/AuthContext';
import type {
  AttendanceRecord,
  AttendanceRecordStatus,
  AttendanceRecordView,
  AttendanceSession,
  AttendanceSessionView,
  ClassAssignmentView,
  Lecturer,
  Notification,
  StudentView,
} from '@/types';

const KEYS = {
  lecturer: ['lecturer', 'me'] as const,
  assignments: ['lecturer', 'assignments'] as const,
  sessions: ['lecturer', 'sessions'] as const,
  activeSession: ['lecturer', 'active-session'] as const,
  records: (sessionId: string) => ['lecturer', 'records', sessionId] as const,
  students: (sectionIds: string[]) => ['lecturer', 'students', sectionIds.join(',')] as const,
  notifications: ['lecturer', 'notifications'] as const,
  unread: ['lecturer', 'unread'] as const,
};

// ============================================================
// CURRENT LECTURER PROFILE
// ============================================================

export function useCurrentLecturer() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.lecturer,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecturers')
        .select('*, user:users(*), department:departments(*)')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as (Lecturer & { user: unknown; department: unknown }) | null;
    },
  });
}

// ============================================================
// ASSIGNED SUBJECTS (class assignments for current lecturer)
// ============================================================

export function useLecturerAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.assignments,
    enabled: !!user?.id,
    queryFn: async () => {
      // First find the lecturer record for this user
      const { data: lec, error: lecErr } = await supabase
        .from('lecturers')
        .select('id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (lecErr) throw lecErr;
      if (!lec) return [] as ClassAssignmentView[];

      const { data, error } = await supabase
        .from('class_assignments')
        .select(
          '*, subject:subjects(*), semester:semesters(*), teaching_type:teaching_types(*), lecturer:lecturers(*, user:users(*)), academic_year:academic_years(*), sections:sections!class_assignment_sections(*)'
        )
        .eq('lecturer_id', lec.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as ClassAssignmentView[]) ?? [];
    },
  });
}

// ============================================================
// ATTENDANCE SESSIONS (for current lecturer)
// ============================================================

export function useLecturerSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.sessions,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: lec, error: lecErr } = await supabase
        .from('lecturers')
        .select('id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (lecErr) throw lecErr;
      if (!lec) return [] as AttendanceSessionView[];

      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(
          '*, subject:subjects(*), teaching_type:teaching_types(*), semester:semesters(*), lecturer:lecturers(*, user:users(*)), room:rooms(*), sections:sections!attendance_session_sections(*), class_assignment:class_assignments(*)'
        )
        .eq('lecturer_id', lec.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as AttendanceSessionView[]) ?? [];
    },
  });
}

export function useActiveLecturerSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.activeSession,
    enabled: !!user?.id,
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data: lec, error: lecErr } = await supabase
        .from('lecturers')
        .select('id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (lecErr) throw lecErr;
      if (!lec) return null;

      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(
          '*, subject:subjects(*), teaching_type:teaching_types(*), semester:semesters(*), lecturer:lecturers(*, user:users(*)), room:rooms(*), sections:sections!attendance_session_sections(*), class_assignment:class_assignments(*)'
        )
        .eq('lecturer_id', lec.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AttendanceSessionView | null) ?? null;
    },
  });
}

export function useCreateAttendanceSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      class_assignment_id: string;
      lecturer_id: string;
      subject_id: string;
      teaching_type_id: string;
      semester_id: string;
      start_time: string;
      end_time: string;
      comments?: string | null;
      room_id?: string | null;
      section_ids: string[];
      qr_rotation_seconds?: number;
      attendance_duration_seconds?: number;
    }) => {
      const { section_ids, ...sessionFields } = input;
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          ...sessionFields,
          internal_session_id: crypto.randomUUID(),
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      const session = data as AttendanceSession;
      if (section_ids.length > 0) {
        const rows = section_ids.map((section_id) => ({
          attendance_session_id: session.id,
          section_id,
        }));
        const { error: secErr } = await supabase.from('attendance_session_sections').insert(rows);
        if (secErr) throw secErr;
      }
      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.activeSession });
    },
  });
}

export function useStartAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      durationSeconds,
    }: {
      sessionId: string;
      durationSeconds: number;
    }) => {
      const now = new Date();
      const endsAt = new Date(now.getTime() + durationSeconds * 1000);
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({
          status: 'active',
          attendance_started_at: now.toISOString(),
          attendance_ends_at: endsAt.toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as AttendanceSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.activeSession });
    },
  });
}

export function useEndAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'ended' })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as AttendanceSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.activeSession });
    },
  });
}

export function useCancelAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as AttendanceSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.activeSession });
    },
  });
}

// ============================================================
// ATTENDANCE RECORDS (for a session)
// ============================================================

export function useSessionRecords(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: KEYS.records(sessionId ?? ''),
    enabled: !!sessionId,
    refetchInterval: sessionId ? 4_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, student:students(*, user:users(*))')
        .eq('attendance_session_id', sessionId!)
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as AttendanceRecordView[]) ?? [];
    },
  });
}

export function useUpsertManualRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attendance_session_id: string;
      student_id: string;
      status: AttendanceRecordStatus;
    }) => {
      // Check for existing record
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('attendance_session_id', input.attendance_session_id)
        .eq('student_id', input.student_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('attendance_records')
          .update({ status: input.status })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as AttendanceRecord;
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          attendance_session_id: input.attendance_session_id,
          student_id: input.student_id,
          status: input.status,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as AttendanceRecord;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.records(vars.attendance_session_id) });
    },
  });
}

// ============================================================
// STUDENTS (for sections — used by manual attendance)
// ============================================================

export function useStudentsForSections(sectionIds: string[]) {
  return useQuery({
    queryKey: KEYS.students(sectionIds),
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, user:users(*), department:departments(*), program:programs(*), semester:semesters(*), section:sections(*)')
        .in('section_id', sectionIds)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('student_id');
      if (error) throw error;
      return (data as unknown as StudentView[]) ?? [];
    },
  });
}

// ============================================================
// NOTIFICATIONS (for current lecturer)
// ============================================================

export function useLecturerNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.notifications,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
  });
}

export function useLecturerUnreadNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.unread,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notifications });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

// ============================================================
// PROFILE UPDATE
// ============================================================

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  return useMutation({
    mutationFn: async (input: { full_name?: string; profile_picture_url?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('users')
        .update(input)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries({ queryKey: KEYS.lecturer });
    },
  });
}

export { KEYS as LECTURER_QUERY_KEYS };
