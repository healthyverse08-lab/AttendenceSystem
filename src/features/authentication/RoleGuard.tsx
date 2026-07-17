import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from '@/types';
import { FullPageLoader } from '@/components/FullPageLoader';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: string;
}

export function RoleGuard({ allowedRoles, children, fallback = '/forbidden' }: RoleGuardProps) {
  const { status, role } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status !== 'authenticated' || !role) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
