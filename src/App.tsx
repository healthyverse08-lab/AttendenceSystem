import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/authentication/AuthContext';
import { LoginPage } from '@/features/authentication/LoginPage';
import { AccessDeniedPage } from '@/features/authentication/AccessDeniedPage';
import { ProtectedRoute } from '@/features/authentication/ProtectedRoute';
import { AppLayout } from '@/components/layouts/AppLayout';
import { DashboardRedirect } from '@/features/dashboard/DashboardRedirect';
import { FullPageLoader } from '@/components/FullPageLoader';
import { AdminRoutes } from '@/features/administrator/AdminRoutes';
import { LecturerRoutes } from '@/features/lecturer/LecturerRoutes';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function RootRedirect() {
  const { status, role } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'denied') return <Navigate to="/access-denied" replace />;
  if (status === 'authenticated') {
    if (role === 'super_admin' || role === 'administrator') return <Navigate to="/admin" replace />;
    if (role === 'lecturer') return <Navigate to="/lecturer" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
              <Route path="/auth/callback" element={<RootRedirect />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/lecturer/*" element={<LecturerRoutes />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DashboardRedirect />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
