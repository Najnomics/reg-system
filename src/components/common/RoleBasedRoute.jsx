import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RoleBasedRoute = ({ children, allowedRoles = [], adminOnly = false, regRepOnly = false }) => {
  const { isAuthenticated, userType, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check specific role requirements
  if (adminOnly && userType !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This feature requires administrator privileges.</p>
        </div>
      </div>
    );
  }

  if (regRepOnly && userType !== 'reg-rep') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">This feature is only available to registration representatives.</p>
        </div>
      </div>
    );
  }

  // Check allowed roles array
  if (allowedRoles.length > 0 && !allowedRoles.includes(userType)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this feature.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleBasedRoute;