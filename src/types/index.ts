// Domain types mirroring the TSAMS database schema.
// These are the canonical types used across services, hooks, and components.

export type UserRole = 'super_admin' | 'administrator' | 'lecturer' | 'student';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'suspended';
export type AttendanceSessionStatus = 'draft' | 'active' | 'ended' | 'cancelled';
export type AttendanceRecordStatus = 'present' | 'absent' | 'late' | 'excused';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type NotificationType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'emergency'
  | 'attendance'
  | 'leave'
  | 'system';
export type EmploymentStatus = 'active' | 'inactive' | 'archived' | 'on_leave';

export interface SoftDeletable {
  deleted_at: string | null;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface User extends BaseEntity {
  id: string;
  email: string;
  full_name: string;
  profile_picture_url: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface Administrator extends BaseEntity {
  user_id: string;
  admin_id: string | null;
}

export interface Lecturer extends BaseEntity, SoftDeletable {
  user_id: string;
  lecturer_id: string | null;
  department_id: string | null;
  employment_status: EmploymentStatus;
}

export interface Student extends BaseEntity, SoftDeletable {
  user_id: string;
  student_id: string;
  department_id: string | null;
  program_id: string | null;
  semester_id: string | null;
  section_id: string | null;
  intake_id: string | null;
  academic_year_id: string | null;
  status: StudentStatus;
}

export interface Department extends BaseEntity, SoftDeletable {
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

export interface Program extends BaseEntity, SoftDeletable {
  department_id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

export interface AcademicYear extends BaseEntity, SoftDeletable {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Intake extends BaseEntity, SoftDeletable {
  academic_year_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface Semester extends BaseEntity, SoftDeletable {
  name: string;
  number: number;
  is_active: boolean;
}

export interface Section extends BaseEntity, SoftDeletable {
  name: string;
  is_active: boolean;
}

export interface Subject extends BaseEntity, SoftDeletable {
  name: string;
  code: string;
  department_id: string | null;
  program_id: string | null;
  semester_id: string | null;
  credits: number | null;
  is_active: boolean;
}

export interface TeachingType extends BaseEntity, SoftDeletable {
  name: string;
  is_active: boolean;
}

export interface Room extends BaseEntity, SoftDeletable {
  name: string;
  building: string | null;
  capacity: number | null;
  is_active: boolean;
}

export interface ClassAssignment extends BaseEntity, SoftDeletable {
  subject_id: string;
  semester_id: string;
  teaching_type_id: string;
  lecturer_id: string;
  academic_year_id: string | null;
  is_active: boolean;
}

export interface ClassAssignmentSection {
  class_assignment_id: string;
  section_id: string;
}

export interface AttendanceSession extends BaseEntity {
  internal_session_id: string;
  class_assignment_id: string;
  lecturer_id: string;
  subject_id: string;
  teaching_type_id: string;
  semester_id: string;
  start_time: string;
  end_time: string;
  comments: string | null;
  room_id: string | null;
  status: AttendanceSessionStatus;
  qr_rotation_seconds: number;
  attendance_duration_seconds: number;
  attendance_started_at: string | null;
  attendance_ends_at: string | null;
}

export interface AttendanceSessionSection {
  attendance_session_id: string;
  section_id: string;
}

export interface AttendanceRecord {
  id: string;
  attendance_session_id: string;
  student_id: string;
  status: AttendanceRecordStatus;
  qr_token: string | null;
  submitted_at: string;
  submitted_ip: string | null;
  created_at: string;
}

export interface Notification extends BaseEntity {
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  is_read: boolean;
}

export interface LeaveApplication extends BaseEntity {
  applicant_id: string;
  applicant_role: 'student' | 'lecturer';
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

// Composite / joined views used by the UI
export interface ClassAssignmentView extends ClassAssignment {
  subject?: Subject;
  semester?: Semester;
  teaching_type?: TeachingType;
  lecturer?: Lecturer & { user?: User };
  academic_year?: AcademicYear;
  sections?: Section[];
}

export interface StudentView extends Student {
  user?: User;
  department?: Department;
  program?: Program;
  semester?: Semester;
  section?: Section;
  intake?: Intake;
  academic_year?: AcademicYear;
}

export interface SubjectView extends Subject {
  department?: Department;
  program?: Program;
  semester?: Semester;
}

export interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  totalSubjects: number;
  totalDepartments: number;
  totalPrograms: number;
  totalSections: number;
  activeAttendanceSessions: number;
  todaysAttendanceRecords: number;
  averageCollegeAttendance: number;
  pendingLeaveRequests: number;
  activeNotifications: number;
}

export interface AttendanceSessionView extends AttendanceSession {
  subject?: Subject;
  teaching_type?: TeachingType;
  semester?: Semester;
  lecturer?: Lecturer & { user?: User };
  room?: Room;
  sections?: Section[];
  class_assignment?: ClassAssignmentView;
}

export interface AttendanceRecordView extends AttendanceRecord {
  student?: Student & { user?: User };
  attendance_session?: AttendanceSession;
}

export interface AuthSession {
  user: User;
  profile: Administrator | Lecturer | Student | null;
  role: UserRole;
}
