import {
  LayoutDashboard,
  BookOpen,
  PlayCircle,
  Users,
  ClipboardCheck,
  History,
  Bell,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: string;
}

export const LECTURER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/lecturer', icon: LayoutDashboard, group: 'Overview' },

  { label: 'Assigned Subjects', to: '/lecturer/subjects', icon: BookOpen, group: 'Teaching' },
  { label: 'Start Attendance', to: '/lecturer/start', icon: PlayCircle, group: 'Teaching' },
  { label: 'Active Session', to: '/lecturer/active', icon: Users, group: 'Teaching' },
  { label: 'Manual Attendance', to: '/lecturer/manual', icon: ClipboardCheck, group: 'Teaching' },

  { label: 'Attendance History', to: '/lecturer/history', icon: History, group: 'Records' },

  { label: 'Notifications', to: '/lecturer/notifications', icon: Bell, group: 'Account' },
  { label: 'Profile', to: '/lecturer/profile', icon: UserCircle, group: 'Account' },
];

export const LECTURER_NAV_GROUPS = Array.from(new Set(LECTURER_NAV.map((n) => n.group)));
