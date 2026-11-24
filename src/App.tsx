/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { UniversityProvider } from './contexts/UniversityContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { SessionTimeoutGuard } from './components/SessionTimeoutGuard';
import { Welcome } from './pages/Welcome';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentProfile } from './pages/student/StudentProfile';
import { CourseRegistrationPage } from './pages/student/CourseRegistration';
import { MyCourses } from './pages/student/MyCourses';
import { StudentSettings } from './pages/student/StudentSettings';
import { SetupWizard } from './pages/admin/SetupWizard';
import { UserManagement } from './pages/admin/Users';
import { AcademicManagement } from './pages/admin/Academic';
import { StudentProfile360 } from './pages/StudentProfile360';
import { Admissions } from './pages/Admissions';
import { OfficesTeams } from './pages/OfficesTeams';
import { ApprovalsInbox } from './pages/ApprovalsInbox';
import { RBACManager } from './pages/RBACManager';
import { Classes } from './pages/Classes';
import { Timetable } from './pages/Timetable';
import { Attendance } from './pages/Attendance';
import { LMS } from './pages/LMS';
import { Assignments } from './pages/Assignments';
import { Examinations } from './pages/Examinations';
import { Finance } from './pages/Finance';
import { HRPayroll } from './pages/HRPayroll';
import { Library } from './pages/Library';
import { Hostel } from './pages/Hostel';
import { Transport } from './pages/Transport';
import { Events } from './pages/Events';
import { Placements } from './pages/Placements';
import { Certificates } from './pages/Certificates';
import { Support } from './pages/Support';
import { Discipline } from './pages/Discipline';
import { Notices } from './pages/Notices';
import { CalendarPage } from './pages/CalendarPage';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { SettingsPage } from './pages/SettingsPage';
import { Profile } from './pages/Profile';
import { Permission } from './config/rbac';

const AppRoute = ({
  children,
  requiredPermission,
  requiredPermissions,
  allowedRoles
}: {
  children: React.ReactNode;
  requiredPermission?: Permission;
  requiredPermissions?: Permission[];
  allowedRoles?: any[];
}) => (
  <ProtectedRoute
    requiredPermission={requiredPermission}
    requiredPermissions={requiredPermissions}
    allowedRoles={allowedRoles}
  >
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <UniversityProvider>
            <Router>
              <SessionTimeoutGuard />
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  }
                />

                <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
                <Route
                  path="/student-dashboard"
                  element={
                    <AppRoute allowedRoles={['student']}>
                      <StudentDashboard />
                    </AppRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <AppRoute allowedRoles={['student']}>
                      <StudentProfile />
                    </AppRoute>
                  }
                />
                <Route
                  path="/student/registration"
                  element={
                    <AppRoute allowedRoles={['student']}>
                      <CourseRegistrationPage />
                    </AppRoute>
                  }
                />
                <Route
                  path="/student/courses"
                  element={
                    <AppRoute allowedRoles={['student']}>
                      <MyCourses />
                    </AppRoute>
                  }
                />
                <Route
                  path="/student/settings"
                  element={
                    <AppRoute allowedRoles={['student']}>
                      <StudentSettings />
                    </AppRoute>
                  }
                />

                {/* Governance, Setup & RBAC */}
                <Route path="/admin/setup" element={<AppRoute requiredPermission="university.setup"><SetupWizard /></AppRoute>} />
                <Route path="/admin/users" element={<AppRoute requiredPermission="users.manage"><UserManagement /></AppRoute>} />
                <Route path="/admin/academic" element={<AppRoute requiredPermission="academics.manage"><AcademicManagement /></AppRoute>} />
                <Route path="/students/:studentId" element={<AppRoute><StudentProfile360 /></AppRoute>} />
                <Route path="/admissions" element={<AppRoute requiredPermission="admissions.manage"><Admissions /></AppRoute>} />
                <Route path="/offices-teams" element={<AppRoute requiredPermission="offices.manage"><OfficesTeams /></AppRoute>} />
                <Route path="/approvals" element={<AppRoute requiredPermission="approvals.manage"><ApprovalsInbox /></AppRoute>} />
                <Route path="/rbac" element={<AppRoute requiredPermission="rbac.manage"><RBACManager /></AppRoute>} />

                {/* Academics & LMS */}
                <Route path="/classes" element={<AppRoute requiredPermission="classes.view"><Classes /></AppRoute>} />
                <Route path="/timetable" element={<AppRoute requiredPermissions={['timetable.manage', 'timetable.view']}><Timetable /></AppRoute>} />
                <Route path="/attendance" element={<AppRoute requiredPermissions={['attendance.mark', 'attendance.view']}><Attendance /></AppRoute>} />
                <Route path="/lms" element={<AppRoute requiredPermissions={['lms.manage', 'lms.access']}><LMS /></AppRoute>} />
                <Route path="/assignments" element={<AppRoute requiredPermissions={['assignments.manage', 'assignments.submit']}><Assignments /></AppRoute>} />
                <Route path="/examinations" element={<AppRoute requiredPermissions={['exams.manage', 'marks.enter', 'results.approve', 'results.view']}><Examinations /></AppRoute>} />

                {/* Finance, HR & Campus Operations */}
                <Route path="/finance" element={<AppRoute requiredPermissions={['finance.manage', 'finance.view', 'scholarships.manage']}><Finance /></AppRoute>} />
                <Route path="/hr" element={<AppRoute requiredPermissions={['hr.manage', 'payroll.manage', 'leave.apply']}><HRPayroll /></AppRoute>} />
                <Route path="/library" element={<AppRoute requiredPermissions={['library.manage', 'library.view']}><Library /></AppRoute>} />
                <Route path="/hostel" element={<AppRoute requiredPermissions={['hostel.manage', 'hostel.view']}><Hostel /></AppRoute>} />
                <Route path="/transport" element={<AppRoute requiredPermissions={['transport.manage', 'transport.view']}><Transport /></AppRoute>} />
                <Route path="/events" element={<AppRoute requiredPermissions={['events.manage', 'events.view']}><Events /></AppRoute>} />
                <Route path="/placements" element={<AppRoute requiredPermissions={['placement.manage', 'placement.view']}><Placements /></AppRoute>} />

                {/* Student Life, Governance & Settings */}
                <Route path="/certificates" element={<AppRoute requiredPermissions={['certificates.manage', 'certificates.request']}><Certificates /></AppRoute>} />
                <Route path="/support" element={<AppRoute requiredPermissions={['support.manage', 'support.create']}><Support /></AppRoute>} />
                <Route path="/discipline" element={<AppRoute requiredPermission="discipline.manage"><Discipline /></AppRoute>} />
                <Route path="/notices" element={<AppRoute><Notices /></AppRoute>} />
                <Route path="/calendar" element={<AppRoute><CalendarPage /></AppRoute>} />
                <Route path="/reports" element={<AppRoute requiredPermission="reports.view"><Reports /></AppRoute>} />
                <Route path="/audit-logs" element={<AppRoute requiredPermission="audit.view"><AuditLogs /></AppRoute>} />
                <Route path="/settings" element={<AppRoute requiredPermission="settings.manage"><SettingsPage /></AppRoute>} />
                <Route path="/profile" element={<AppRoute><Profile /></AppRoute>} />

                <Route
                  path="/unauthorized"
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF] dark:bg-zinc-950 p-4">
                      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                        <h1 className="text-3xl font-bold font-mono text-[#111111] dark:text-zinc-100 mb-2">403</h1>
                        <p className="text-sm text-[#52525B] dark:text-zinc-400 mb-6">
                          Your current role scope does not grant permission to access this module.
                        </p>
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold bg-[#111111] dark:bg-white dark:text-zinc-950 text-white rounded-lg hover:bg-[#27272A] dark:hover:bg-zinc-200"
                        >
                          Return to Workspace
                        </Link>
                      </div>
                    </div>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </UniversityProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
