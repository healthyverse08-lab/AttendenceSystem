import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { UserRole } from '@/types';
import { FullPageLoader } from '@/components/FullPageLoader';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'denied') return <Navigate to="/access-denied" replace />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children}</>;
}
