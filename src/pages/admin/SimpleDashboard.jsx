import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/apiService';

const SimpleDashboard = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const { showSuccess, showError } = useApp();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStats();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    showSuccess('Logged out successfully');
  };

  const handleCreateSession = () => {
    navigate('/admin/sessions/new');
  };

  const handleGenerateReport = () => {
    navigate('/admin/reports');
  };

  const handleAssignUnassignedToChariots = async () => {
    if (!window.confirm('Assign all unassigned members to chariots?')) return;
    try {
      const response = await apiService.assignUnassignedMembersToChariots();
      showSuccess(
        `Assigned ${response?.data?.assigned || 0} members to chariots`
      );
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to assign members to chariots:', error);
      showError(error.message || 'Failed to assign members to chariots');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-gray-600">{userType === 'admin' ? 'Manage your church attendance and members' : 'View church attendance and member information'}</p>
      </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Members</dt>
                      <dd className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {loading ? '...' : (dashboardData?.stats?.totalMembers || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
                      <dd className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {loading ? '...' : (dashboardData?.stats?.activeSessions || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Today's Attendance</dt>
                      <dd className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {loading ? '...' : (dashboardData?.stats?.todaysAttendance || 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-4 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-5 flex-1 min-w-0">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Attendance Rate</dt>
                      <dd className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {loading ? '...' : `${dashboardData?.stats?.attendanceRate || 0}%`}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Quick Actions</h3>
              <div className="space-y-2 sm:space-y-3">
                <a
                  href="/admin/members"
                  className="block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors touch-manipulation"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{userType === 'admin' ? 'Manage Members' : 'View Members'}</span>
                  </div>
                </a>
                
                {userType === 'admin' && (
                  <button 
                    onClick={handleCreateSession}
                    className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Create New Session</span>
                    </div>
                  </button>
                )}

                <a
                  href="/admin/sessions"
                  className="block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors touch-manipulation"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">View Sessions</span>
                  </div>
                </a>
                
                <button 
                  onClick={handleGenerateReport}
                  className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-yellow-50 hover:bg-yellow-100 rounded-md border border-yellow-200 transition-colors touch-manipulation"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">Generate Report</span>
                  </div>
                </button>

                {userType === 'admin' && (
                  <a
                    href="/admin/reg-reps"
                    className="block w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-purple-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Manage Reg-Reps</span>
                    </div>
                  </a>
                )}

                {userType === 'admin' && (
                  <button
                    onClick={handleAssignUnassignedToChariots}
                    className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors touch-manipulation"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-600 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16M8 6v12M16 6v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Assign Members to Chariots</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Recent Activity</h3>
              <div className="space-y-3 sm:space-y-4">
                {loading ? (
                  <div className="text-gray-500">Loading activities...</div>
                ) : dashboardData?.recentActivity?.length > 0 ? (
                  dashboardData.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start">
                      <div className={`flex-shrink-0 w-2 h-2 bg-${activity.color}-500 rounded-full mt-2`}></div>
                      <div className="ml-3">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No recent activity</div>
                )}
              </div>
            </div>
          </div>
    </div>
  );
};

export default SimpleDashboard;