import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/SimpleAppContext';
import WorkingLoginPage from './pages/admin/WorkingLoginPage';
import SimpleDashboard from './pages/admin/SimpleDashboard';
import CompleteMembersPage from './pages/admin/CompleteMembersPage';
import SessionsPage from './pages/admin/SessionsPage';
import CreateSessionPage from './pages/admin/CreateSessionPage';
import SessionAttendancePage from './pages/admin/SessionAttendancePage';
import ReportsPage from './pages/admin/ReportsPage';
import RegRepsPage from './pages/admin/RegRepsPage';
import CheckInPage from './pages/public/CheckinPage';
import SimpleProtectedRoute from './components/common/SimpleProtectedRoute';
import RoleBasedRoute from './components/common/RoleBasedRoute';
import SimpleNotificationContainer from './components/common/SimpleNotificationContainer';
import ErrorBoundary from './components/common/ErrorBoundary';
import AdminLayout from './components/admin/AdminLayout';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Router>
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
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reg-reps" element={
                  <RoleBasedRoute adminOnly={true}>
                    <RegRepsPage />
                  </RoleBasedRoute>
                } />
              </Route>
              
              {/* Default Redirects */}
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
            
            {/* Global Notifications */}
            <SimpleNotificationContainer />
          </Router>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
