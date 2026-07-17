import {
  LayoutDashboard,
  QrCode,
  History,
  BookOpen,
  BarChart3,
  Bell,
  CalendarX,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
}

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/student', icon: LayoutDashboard, group: 'Overview' },

  { label: 'Scan Attendance', to: '/student/scan', icon: QrCode, group: 'Attendance' },
  { label: 'Attendance History', to: '/student/history', icon: History, group: 'Attendance' },
  { label: 'My Subjects', to: '/student/subjects', icon: BookOpen, group: 'Attendance' },
  { label: 'Attendance Summary', to: '/student/summary', icon: BarChart3, group: 'Attendance' },

  { label: 'Leave Applications', to: '/student/leave', icon: CalendarX, group: 'Account' },
  { label: 'Notifications', to: '/student/notifications', icon: Bell, group: 'Account' },
  { label: 'Profile', to: '/student/profile', icon: UserCircle, group: 'Account' },
];

export const STUDENT_NAV_GROUPS = Array.from(new Set(STUDENT_NAV.map((n) => n.group)));
