import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/authentication/AuthContext';
import { DashboardPlaceholder } from './DashboardPlaceholder';

export function DashboardRedirect() {
  const { role, status } = useAuth();
  if (status !== 'authenticated' || !role) return <Navigate to="/login" replace />;
  if (role === 'lecturer') return <Navigate to="/lecturer" replace />;
  if (role === 'super_admin' || role === 'administrator') return <Navigate to="/admin" replace />;

  return <DashboardPlaceholder role={role} />;
}
