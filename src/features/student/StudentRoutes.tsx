import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { StudentLayout } from './StudentLayout';
import { RoleGuard } from '@/features/authentication/RoleGuard';
import { FullPageLoader } from '@/components/FullPageLoader';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ScanAttendancePage = lazy(() => import('./pages/ScanAttendancePage'));
const AttendanceHistoryPage = lazy(() => import('./pages/AttendanceHistoryPage'));
const SubjectAttendancePage = lazy(() => import('./pages/SubjectAttendancePage'));
const AttendanceSummaryPage = lazy(() => import('./pages/AttendanceSummaryPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const LeaveApplicationsPage = lazy(() => import('./pages/LeaveApplicationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export function StudentRoutes() {
  return (
    <RoleGuard allowedRoles={['student']}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route element={<StudentLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="scan" element={<ScanAttendancePage />} />
            <Route path="history" element={<AttendanceHistoryPage />} />
            <Route path="subjects" element={<SubjectAttendancePage />} />
            <Route path="summary" element={<AttendanceSummaryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="leave" element={<LeaveApplicationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </RoleGuard>
  );
}
