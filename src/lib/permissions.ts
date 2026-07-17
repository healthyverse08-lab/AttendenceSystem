import type { UserRole } from '@/types';

// ============================================================
// RBAC Permission Matrix
// Centralized permission definitions for TSAMS.
// Every permission check must go through `can()` — never inline.
// ============================================================

export type Permission =
  | 'users.view.all'
  | 'users.manage.admins'
  | 'users.manage.students'
  | 'users.manage.lecturers'
  | 'settings.view'
  | 'settings.update'
  | 'settings.update.global'
  | 'audit.view'
  | 'attendance.start'
  | 'attendance.end'
  | 'attendance.manual'
  | 'attendance.export'
  | 'attendance.view.own'
  | 'attendance.view.assigned'
  | 'attendance.view.all'
  | 'attendance.scan'
  | 'academic.manage'
  | 'academic.view'
  | 'leave.submit'
  | 'leave.approve'
  | 'leave.view.own'
  | 'leave.view.all'
  | 'notifications.send'
  | 'notifications.view.own'
  | 'reports.view'
  | 'profile.update.own';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'users.view.all',
    'users.manage.admins',
    'users.manage.students',
    'users.manage.lecturers',
    'settings.view',
    'settings.update',
    'settings.update.global',
    'audit.view',
    'attendance.view.all',
    'academic.manage',
    'academic.view',
    'leave.approve',
    'leave.view.all',
    'notifications.send',
    'reports.view',
    'profile.update.own',
  ],
  administrator: [
    'users.view.all',
    'users.manage.students',
    'users.manage.lecturers',
    'settings.view',
    'settings.update',
    'audit.view',
    'attendance.view.all',
    'academic.manage',
    'academic.view',
    'leave.approve',
    'leave.view.all',
    'notifications.send',
    'reports.view',
    'profile.update.own',
  ],
  lecturer: [
    'attendance.start',
    'attendance.end',
    'attendance.manual',
    'attendance.export',
    'attendance.view.assigned',
    'academic.view',
    'leave.submit',
    'leave.view.own',
    'notifications.view.own',
    'profile.update.own',
  ],
  student: [
    'attendance.scan',
    'attendance.view.own',
    'academic.view',
    'leave.submit',
    'leave.view.own',
    'notifications.view.own',
    'profile.update.own',
  ],
};

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole | null | undefined, ...permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole | null | undefined, ...permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAccessRoleResource(
  actorRole: UserRole | null | undefined,
  resourceOwnerRole: UserRole,
  _action: 'view' | 'edit' | 'delete'
): boolean {
  if (!actorRole) return false;
  if (actorRole === 'super_admin') return true;

  if (resourceOwnerRole === 'super_admin') {
    return false;
  }

  if (actorRole === 'administrator') {
    return resourceOwnerRole === 'lecturer' || resourceOwnerRole === 'student';
  }

  return false;
}
