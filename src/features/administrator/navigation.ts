import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  CalendarDays,
  Layers,
  DoorOpen,
  ClipboardList,
  Bell,
  CalendarClock,
  BarChart3,
  FileDown,
  History,
  Settings,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, group: 'Overview' },

  { label: 'Students', to: '/admin/students', icon: Users, group: 'People' },
  { label: 'Lecturers', to: '/admin/lecturers', icon: GraduationCap, group: 'People' },

  { label: 'Departments', to: '/admin/departments', icon: Building2, group: 'Academic' },
  { label: 'Programs', to: '/admin/programs', icon: BookOpen, group: 'Academic' },
  { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarDays, group: 'Academic' },
  { label: 'Intakes', to: '/admin/intakes', icon: Layers, group: 'Academic' },
  { label: 'Semesters', to: '/admin/semesters', icon: CalendarClock, group: 'Academic' },
  { label: 'Sections', to: '/admin/sections', icon: Layers, group: 'Academic' },
  { label: 'Subjects', to: '/admin/subjects', icon: BookOpen, group: 'Academic' },
  { label: 'Teaching Types', to: '/admin/teaching-types', icon: ShieldAlert, group: 'Academic' },
  { label: 'Rooms', to: '/admin/rooms', icon: DoorOpen, group: 'Academic' },
  { label: 'Class Assignments', to: '/admin/class-assignments', icon: ClipboardList, group: 'Academic' },

  { label: 'Notifications', to: '/admin/notifications', icon: Bell, group: 'Operations' },
  { label: 'Leave Applications', to: '/admin/leave', icon: CalendarClock, group: 'Operations' },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3, group: 'Operations' },
  { label: 'Reports', to: '/admin/reports', icon: FileDown, group: 'Operations' },
  { label: 'Audit Logs', to: '/admin/audit-logs', icon: History, group: 'Operations' },

  { label: 'Attendance Policy', to: '/admin/attendance-policy', icon: ShieldAlert, group: 'System' },
  { label: 'System Settings', to: '/admin/settings', icon: Settings, group: 'System' },
];

export const NAV_GROUPS = Array.from(new Set(ADMIN_NAV.map((n) => n.group)));
