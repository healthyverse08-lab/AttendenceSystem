import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LecturerLayout } from './LecturerLayout';
import { RoleGuard } from '@/features/authentication/RoleGuard';
import { FullPageLoader } from '@/components/FullPageLoader';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AssignedSubjectsPage = lazy(() => import('./pages/AssignedSubjectsPage'));
const StartAttendancePage = lazy(() => import('./pages/StartAttendancePage'));
const ActiveSessionPage = lazy(() => import('./pages/ActiveSessionPage'));
const ManualAttendancePage = lazy(() => import('./pages/ManualAttendancePage'));
const AttendanceHistoryPage = lazy(() => import('./pages/AttendanceHistoryPage'));
const SessionDetailsPage = lazy(() => import('./pages/SessionDetailsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export function LecturerRoutes() {
  return (
    <RoleGuard allowedRoles={['lecturer']}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route element={<LecturerLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="subjects" element={<AssignedSubjectsPage />} />
            <Route path="start" element={<StartAttendancePage />} />
            <Route path="active" element={<ActiveSessionPage />} />
            <Route path="manual" element={<ManualAttendancePage />} />
            <Route path="history" element={<AttendanceHistoryPage />} />
            <Route path="sessions/:sessionId" element={<SessionDetailsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/lecturer" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </RoleGuard>
  );
}
