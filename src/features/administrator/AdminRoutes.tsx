import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { RoleGuard } from '@/features/authentication/RoleGuard';
import { FullPageLoader } from '@/components/FullPageLoader';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StudentsPage = lazy(() => import('./pages/StudentsPage'));
const LecturersPage = lazy(() => import('./pages/LecturersPage'));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const AcademicYearsPage = lazy(() => import('./pages/AcademicYearsPage'));
const IntakesPage = lazy(() => import('./pages/IntakesPage'));
const SemestersPage = lazy(() => import('./pages/SemestersPage'));
const SectionsPage = lazy(() => import('./pages/SectionsPage'));
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'));
const TeachingTypesPage = lazy(() => import('./pages/TeachingTypesPage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const ClassAssignmentsPage = lazy(() => import('./pages/ClassAssignmentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const LeaveApplicationsPage = lazy(() => import('./pages/LeaveApplicationsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const AttendancePolicyPage = lazy(() => import('./pages/AttendancePolicyPage'));
const SystemSettingsPage = lazy(() => import('./pages/SystemSettingsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

export function AdminRoutes() {
  return (
    <RoleGuard allowedRoles={['super_admin', 'administrator']}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="lecturers" element={<LecturersPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="academic-years" element={<AcademicYearsPage />} />
            <Route path="intakes" element={<IntakesPage />} />
            <Route path="semesters" element={<SemestersPage />} />
            <Route path="sections" element={<SectionsPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="teaching-types" element={<TeachingTypesPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="class-assignments" element={<ClassAssignmentsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="leave" element={<LeaveApplicationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="attendance-policy" element={<AttendancePolicyPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </RoleGuard>
  );
}
