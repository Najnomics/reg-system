import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/SimpleAppContext';
import SimpleProtectedRoute from './components/common/SimpleProtectedRoute';
import ChariotProtectedRoute from './components/common/ChariotProtectedRoute';
import RoleBasedRoute from './components/common/RoleBasedRoute';
import SimpleNotificationContainer from './components/common/SimpleNotificationContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import AdminLayout from './components/admin/AdminLayout';
import ChariotLayout from './components/chariot/ChariotLayout';
import './index.css';

// Lazy load pages for code splitting
const WorkingLoginPage = lazy(() => import('./pages/admin/WorkingLoginPage'));
const SimpleDashboard = lazy(() => import('./pages/admin/SimpleDashboard'));
const CompleteMembersPage = lazy(() => import('./pages/admin/CompleteMembersPage'));
const SessionsPage = lazy(() => import('./pages/admin/SessionsPage'));
const CreateSessionPage = lazy(() => import('./pages/admin/CreateSessionPage'));
const SessionAttendancePage = lazy(() => import('./pages/admin/SessionAttendancePage'));
const SessionChariotAttendancePage = lazy(() => import('./pages/admin/SessionChariotAttendancePage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const RegRepsPage = lazy(() => import('./pages/admin/RegRepsPage'));
const ChariotsPage = lazy(() => import('./pages/admin/ChariotsPage'));
const ChapelsPage = lazy(() => import('./pages/admin/ChapelsPage'));
const CheckInPage = lazy(() => import('./pages/public/CheckinPage'));
const ChariotDashboard = lazy(() => import('./pages/chariot/ChariotDashboard'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Router>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/admin/login" element={<WorkingLoginPage />} />
                <Route path="/checkin/:sessionId" element={<CheckInPage />} />
                
                {/* Protected Admin Routes */}
                <Route path="/admin" element={
                  <SimpleProtectedRoute>
                    <AdminLayout />
                  </SimpleProtectedRoute>
                }>
                  <Route index element={<SimpleDashboard />} />
                  <Route path="dashboard" element={<SimpleDashboard />} />
                  <Route path="members" element={<CompleteMembersPage />} />
                  <Route path="sessions" element={<SessionsPage />} />
                  <Route path="sessions/new" element={
                    <RoleBasedRoute adminOnly={true}>
                      <CreateSessionPage />
                    </RoleBasedRoute>
                  } />
                  <Route path="sessions/:sessionId/attendance" element={<SessionAttendancePage />} />
                  <Route path="sessions/:sessionId/chariot-attendance" element={<SessionChariotAttendancePage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="reg-reps" element={
                    <RoleBasedRoute adminOnly={true}>
                      <RegRepsPage />
                    </RoleBasedRoute>
                  } />
                  <Route path="chariots" element={
                    <RoleBasedRoute allowedRoles={['admin', 'pastoral']}>
                      <ChariotsPage />
                    </RoleBasedRoute>
                  } />
                  <Route path="chapels" element={
                    <RoleBasedRoute allowedRoles={['admin', 'pastoral']}>
                      <ChapelsPage />
                    </RoleBasedRoute>
                  } />
                </Route>

                {/* Protected Chariot Routes */}
                <Route path="/chariot" element={
                  <ChariotProtectedRoute>
                    <ChariotLayout />
                  </ChariotProtectedRoute>
                }>
                  <Route index element={<Navigate to="/chariot/dashboard" replace />} />
                  <Route path="dashboard" element={<ChariotDashboard key="dashboard" />} />
                  <Route path="members" element={<ChariotDashboard key="members" />} />
                  <Route path="sessions" element={<ChariotDashboard key="sessions" />} />
                </Route>
                
                {/* Default Redirects */}
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Suspense>
            
            {/* Global Notifications */}
            <SimpleNotificationContainer />
          </Router>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
