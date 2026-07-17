import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/authentication/AuthContext';
import type {
  AttendanceRecordView,
  AttendanceSessionView,
  ClassAssignmentView,
  LeaveApplication,
  Notification,
  StudentView,
} from '@/types';

const KEYS = {
  profile: ['student', 'me'] as const,
  assignments: ['student', 'assignments'] as const,
  sessions: ['student', 'sessions'] as const,
  records: ['student', 'records'] as const,
  notifications: ['student', 'notifications'] as const,
  unread: ['student', 'unread'] as const,
  leave: ['student', 'leave'] as const,
};

export function useCurrentStudent() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.profile,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(
          '*, user:users(*), department:departments(*), program:programs(*), semester:semesters(*), section:sections(*), intake:intakes(*), academic_year:academic_years(*)'
        )
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as StudentView | null;
    },
  });
}

export function useStudentAssignments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.assignments,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id, section_id, semester_id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!student?.section_id) return [] as ClassAssignmentView[];

      const { data, error } = await supabase
        .from('class_assignments')
        .select(
          '*, subject:subjects(*), semester:semesters(*), teaching_type:teaching_types(*), lecturer:lecturers(*, user:users(*)), academic_year:academic_years(*), sections:sections!class_assignment_sections(*)'
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const all = (data as unknown as ClassAssignmentView[]) ?? [];
      return all.filter((a) => a.sections?.some((s) => s.id === student.section_id));
    },
  });
}

export function useStudentSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.sessions,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id, section_id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!student?.section_id) return [] as AttendanceSessionView[];

      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(
          '*, subject:subjects(*), teaching_type:teaching_types(*), semester:semesters(*), lecturer:lecturers(*, user:users(*)), room:rooms(*), sections:sections!attendance_session_sections(*)'
        )
        .order('start_time', { ascending: false });
      if (error) throw error;

      const all = (data as unknown as AttendanceSessionView[]) ?? [];
      return all.filter((s) => s.sections?.some((sec) => sec.id === student.section_id));
    },
  });
}

export function useStudentRecords() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.records,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!student) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select(
          '*, attendance_session:attendance_sessions(*, subject:subjects(*), teaching_type:teaching_types(*), lecturer:lecturers(*, user:users(*)))'
        )
        .eq('student_id', student.id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as (AttendanceRecordView & {
        attendance_session: AttendanceSessionView;
      })[]) ?? [];
    },
  });
}

export function useSubmitAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session_id: string; qr_token: string }) => {
      const { data, error } = await supabase.functions.invoke('attendance-submit', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.records });
    },
  });
}

export function useStudentNotifications() {
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

export function useStudentUnreadNotifications() {
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

export function useStudentLeaveApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: KEYS.leave,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('applicant_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as LeaveApplication[]) ?? [];
    },
  });
}

export function useCreateLeaveApplication() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      start_date: string;
      end_date: string;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('leave_applications')
        .insert({
          applicant_id: user!.id,
          applicant_role: 'student',
          ...input,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LeaveApplication;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.leave }),
  });
}

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
      qc.invalidateQueries({ queryKey: KEYS.profile });
    },
  });
}

export type StudentRecord = Awaited<ReturnType<typeof useStudentRecords>>['data'] extends infer T
  ? T extends (infer U)[]
    ? U
    : never
  : never;

export { KEYS as STUDENT_QUERY_KEYS };
