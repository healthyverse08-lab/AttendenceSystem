import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  AcademicYear,
  AuditLog,
  ClassAssignment,
  ClassAssignmentView,
  Department,
  Intake,
  LeaveApplication,
  Lecturer,
  Notification,
  Program,
  Room,
  Section,
  Semester,
  Student,
  StudentView,
  Subject,
  SubjectView,
  SystemSetting,
  TeachingType,
  User,
} from '@/types';
import { useAuth } from '@/features/authentication/AuthContext';

const KEYS = {
  departments: ['admin', 'departments'] as const,
  programs: ['admin', 'programs'] as const,
  academicYears: ['admin', 'academic-years'] as const,
  intakes: ['admin', 'intakes'] as const,
  semesters: ['admin', 'semesters'] as const,
  sections: ['admin', 'sections'] as const,
  subjects: ['admin', 'subjects'] as const,
  teachingTypes: ['admin', 'teaching-types'] as const,
  rooms: ['admin', 'rooms'] as const,
  classAssignments: ['admin', 'class-assignments'] as const,
  students: ['admin', 'students'] as const,
  lecturers: ['admin', 'lecturers'] as const,
  administrators: ['admin', 'administrators'] as const,
  notifications: ['admin', 'notifications'] as const,
  leave: ['admin', 'leave'] as const,
  auditLogs: ['admin', 'audit-logs'] as const,
  settings: ['admin', 'settings'] as const,
  stats: ['admin', 'stats'] as const,
};

// Generic active-only filter helper (kept for reference by future prompts)
// function activeOnly() { return { deleted_at: null }; }

// ============================================================
// ACADEMIC STRUCTURE
// ============================================================

export function useDepartments() {
  return useQuery({
    queryKey: KEYS.departments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; description?: string }) => {
      const { data, error } = await supabase.from('departments').insert(input).select().single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.departments }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Department>) => {
      const { data, error } = await supabase.from('departments').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.departments }),
  });
}

export function useSoftDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.departments }),
  });
}

// Programs
export function usePrograms() {
  return useQuery({
    queryKey: KEYS.programs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, department:departments(*)')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as (Program & { department: Department | null })[];
    },
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; code: string; department_id: string; description?: string }) => {
      const { data, error } = await supabase.from('programs').insert(input).select().single();
      if (error) throw error;
      return data as Program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.programs }),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Program>) => {
      const { data, error } = await supabase.from('programs').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.programs }),
  });
}

export function useSoftDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.programs }),
  });
}

// Academic Years
export function useAcademicYears() {
  return useQuery({
    queryKey: KEYS.academicYears,
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_years').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return data as AcademicYear[];
    },
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; start_date: string; end_date: string }) => {
      const { data, error } = await supabase.from('academic_years').insert(input).select().single();
      if (error) throw error;
      return data as AcademicYear;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.academicYears }),
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<AcademicYear>) => {
      const { data, error } = await supabase.from('academic_years').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as AcademicYear;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.academicYears }),
  });
}

export function useSoftDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academic_years').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.academicYears }),
  });
}

// Intakes
export function useIntakes() {
  return useQuery({
    queryKey: KEYS.intakes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intakes')
        .select('*, academic_year:academic_years(*)')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as (Intake & { academic_year: AcademicYear | null })[];
    },
  });
}

export function useCreateIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; academic_year_id: string; start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase.from('intakes').insert(input).select().single();
      if (error) throw error;
      return data as Intake;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.intakes }),
  });
}

export function useUpdateIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Intake>) => {
      const { data, error } = await supabase.from('intakes').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Intake;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.intakes }),
  });
}

export function useSoftDeleteIntake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('intakes').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.intakes }),
  });
}

// Semesters
export function useSemesters() {
  return useQuery({
    queryKey: KEYS.semesters,
    queryFn: async () => {
      const { data, error } = await supabase.from('semesters').select('*').is('deleted_at', null).order('number');
      if (error) throw error;
      return data as Semester[];
    },
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; number: number }) => {
      const { data, error } = await supabase.from('semesters').insert(input).select().single();
      if (error) throw error;
      return data as Semester;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.semesters }),
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Semester>) => {
      const { data, error } = await supabase.from('semesters').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Semester;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.semesters }),
  });
}

export function useSoftDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('semesters').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.semesters }),
  });
}

// Sections
export function useSections() {
  return useQuery({
    queryKey: KEYS.sections,
    queryFn: async () => {
      const { data, error } = await supabase.from('sections').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return data as Section[];
    },
  });
}

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data, error } = await supabase.from('sections').insert(input).select().single();
      if (error) throw error;
      return data as Section;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sections }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Section>) => {
      const { data, error } = await supabase.from('sections').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Section;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sections }),
  });
}

export function useSoftDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sections').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sections }),
  });
}

// Subjects
export function useSubjects() {
  return useQuery({
    queryKey: KEYS.subjects,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, department:departments(*), program:programs(*), semester:semesters(*)')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data as SubjectView[];
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      code: string;
      department_id?: string | null;
      program_id?: string | null;
      semester_id?: string | null;
      credits?: number | null;
    }) => {
      const { data, error } = await supabase.from('subjects').insert(input).select().single();
      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Subject>) => {
      const { data, error } = await supabase.from('subjects').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }),
  });
}

export function useSoftDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.subjects }),
  });
}

// Teaching Types
export function useTeachingTypes() {
  return useQuery({
    queryKey: KEYS.teachingTypes,
    queryFn: async () => {
      const { data, error } = await supabase.from('teaching_types').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return data as TeachingType[];
    },
  });
}

export function useCreateTeachingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data, error } = await supabase.from('teaching_types').insert(input).select().single();
      if (error) throw error;
      return data as TeachingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.teachingTypes }),
  });
}

export function useUpdateTeachingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<TeachingType>) => {
      const { data, error } = await supabase.from('teaching_types').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as TeachingType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.teachingTypes }),
  });
}

export function useSoftDeleteTeachingType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teaching_types').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.teachingTypes }),
  });
}

// Rooms
export function useRooms() {
  return useQuery({
    queryKey: KEYS.rooms,
    queryFn: async () => {
      const { data, error } = await supabase.from('rooms').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return data as Room[];
    },
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; building?: string; capacity?: number }) => {
      const { data, error } = await supabase.from('rooms').insert(input).select().single();
      if (error) throw error;
      return data as Room;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rooms }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Room>) => {
      const { data, error } = await supabase.from('rooms').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Room;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rooms }),
  });
}

export function useSoftDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rooms').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.rooms }),
  });
}

// ============================================================
// CLASS ASSIGNMENTS
// ============================================================

export function useClassAssignments() {
  return useQuery({
    queryKey: KEYS.classAssignments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_assignments')
        .select(
          '*, subject:subjects(*), semester:semesters(*), teaching_type:teaching_types(*), lecturer:lecturers(*, user:users(*)), academic_year:academic_years(*), sections:sections!class_assignment_sections(*)'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClassAssignmentView[];
    },
  });
}

export function useCreateClassAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject_id: string;
      semester_id: string;
      teaching_type_id: string;
      lecturer_id: string;
      academic_year_id?: string | null;
      section_ids: string[];
    }) => {
      const { section_ids, ...assignmentFields } = input;
      const { data, error } = await supabase
        .from('class_assignments')
        .insert(assignmentFields)
        .select()
        .single();
      if (error) throw error;
      const ca = data as ClassAssignment;
      if (section_ids.length > 0) {
        const rows = section_ids.map((section_id) => ({ class_assignment_id: ca.id, section_id }));
        const { error: secErr } = await supabase.from('class_assignment_sections').insert(rows);
        if (secErr) throw secErr;
      }
      return ca;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.classAssignments }),
  });
}

export function useUpdateClassAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      section_ids,
      ...input
    }: { id: string; section_ids?: string[] } & Partial<ClassAssignment>) => {
      const { data, error } = await supabase.from('class_assignments').update(input).eq('id', id).select().single();
      if (error) throw error;
      if (section_ids !== undefined) {
        await supabase.from('class_assignment_sections').delete().eq('class_assignment_id', id);
        if (section_ids.length > 0) {
          const rows = section_ids.map((section_id) => ({ class_assignment_id: id, section_id }));
          const { error: secErr } = await supabase.from('class_assignment_sections').insert(rows);
          if (secErr) throw secErr;
        }
      }
      return data as ClassAssignment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.classAssignments }),
  });
}

export function useSoftDeleteClassAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('class_assignments').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.classAssignments }),
  });
}

// ============================================================
// STUDENTS
// ============================================================

export function useStudents() {
  return useQuery({
    queryKey: KEYS.students,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(
          '*, user:users(*), department:departments(*), program:programs(*), semester:semesters(*), section:sections(*), intake:intakes(*), academic_year:academic_years(*)'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudentView[];
    },
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      user_id: string;
      department_id?: string | null;
      program_id?: string | null;
      semester_id?: string | null;
      section_id?: string | null;
      intake_id?: string | null;
      academic_year_id?: string | null;
    }) => {
      const { data, error } = await supabase.from('students').insert(input).select().single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.students }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Student>) => {
      const { data, error } = await supabase.from('students').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Student;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.students }),
  });
}

export function useBulkUpdateStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; [key: string]: unknown }[]) => {
      const { error } = await supabase.from('students').upsert(updates);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.students }),
  });
}

export function useSoftDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.students }),
  });
}

export function useRestoreStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').update({ deleted_at: null, status: 'active' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.students }),
  });
}

// ============================================================
// LECTURERS
// ============================================================

export function useLecturers() {
  return useQuery({
    queryKey: KEYS.lecturers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecturers')
        .select('*, user:users(*), department:departments(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Lecturer & { user: User | null; department: Department | null })[];
    },
  });
}

export function useCreateLecturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; lecturer_id?: string; department_id?: string | null }) => {
      const { data, error } = await supabase.from('lecturers').insert(input).select().single();
      if (error) throw error;
      return data as Lecturer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lecturers }),
  });
}

export function useUpdateLecturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Lecturer>) => {
      const { data, error } = await supabase.from('lecturers').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as Lecturer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lecturers }),
  });
}

export function useSoftDeleteLecturer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lecturers').update({ deleted_at: new Date().toISOString(), employment_status: 'archived' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lecturers }),
  });
}

// ============================================================
// USERS (for creating student/lecturer profiles)
// ============================================================

export function useCreateUser() {
  return useMutation({
    mutationFn: async (input: {
      id: string;
      email: string;
      full_name: string;
      role: 'student' | 'lecturer' | 'administrator';
      profile_picture_url?: string | null;
    }) => {
      const { data, error } = await supabase.from('users').insert(input).select().single();
      if (error) throw error;
      return data as User;
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<User>) => {
      const { data, error } = await supabase.from('users').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as User;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.students });
      qc.invalidateQueries({ queryKey: KEYS.lecturers });
    },
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export function useNotifications() {
  return useQuery({
    queryKey: KEYS.notifications,
    queryFn: async () => {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      title: string;
      body?: string;
      type?: string;
    }) => {
      const { data, error } = await supabase.from('notifications').insert(input).select().single();
      if (error) throw error;
      return data as Notification;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications }),
  });
}

export function useBulkCreateNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { user_id: string; title: string; body?: string; type?: string }[]) => {
      const { error } = await supabase.from('notifications').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications }),
  });
}

// ============================================================
// LEAVE APPLICATIONS
// ============================================================

export function useLeaveApplications() {
  return useQuery({
    queryKey: KEYS.leave,
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_applications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveApplication[];
    },
  });
}

export function useReviewLeave() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('leave_applications')
        .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LeaveApplication;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.leave }),
  });
}

// ============================================================
// AUDIT LOGS
// ============================================================

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: [KEYS.auditLogs, limit],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

export function useLogAudit() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { action: string; entity_type?: string; entity_id?: string; metadata?: Record<string, unknown> }) => {
      const { error } = await supabase.from('audit_logs').insert({ actor_id: user?.id ?? null, ...input });
      if (error) throw error;
    },
  });
}

// ============================================================
// SYSTEM SETTINGS
// ============================================================

export function useSystemSettings() {
  return useQuery({
    queryKey: KEYS.settings,
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('*').order('key');
      if (error) throw error;
      return data as SystemSetting[];
    },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.settings }),
  });
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: KEYS.stats,
    queryFn: async () => {
      const [students, lecturers, subjects, departments, programs, sections, activeSessions, todaysRecords, pendingLeave, notifications] =
        await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('lecturers').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('subjects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('departments').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('programs').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('sections').select('id', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('attendance_sessions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('attendance_records').select('id', { count: 'exact', head: true }).gte('submitted_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
          supabase.from('leave_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('notifications').select('id', { count: 'exact', head: true }),
        ]);

      const errors = [students, lecturers, subjects, departments, programs, sections, activeSessions, todaysRecords, pendingLeave, notifications].filter(
        (r) => r.error
      );
      if (errors.length) throw errors[0].error;

      return {
        totalStudents: students.count ?? 0,
        totalLecturers: lecturers.count ?? 0,
        totalSubjects: subjects.count ?? 0,
        totalDepartments: departments.count ?? 0,
        totalPrograms: programs.count ?? 0,
        totalSections: sections.count ?? 0,
        activeAttendanceSessions: activeSessions.count ?? 0,
        todaysAttendanceRecords: todaysRecords.count ?? 0,
        averageCollegeAttendance: 0,
        pendingLeaveRequests: pendingLeave.count ?? 0,
        activeNotifications: notifications.count ?? 0,
      };
    },
  });
}

export { KEYS };
