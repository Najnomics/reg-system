import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/SimpleAppContext';
import { apiService } from '../../services/apiService';
import ChariotMembersList from '../../components/chariot/ChariotMembersList';
import ChariotSessionsList from '../../components/chariot/ChariotSessionsList';
import { useLocation, useNavigate } from 'react-router-dom';

const ChariotDashboard = () => {
  const { user, userType } = useAuth();
  const { showError } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSessions: 0,
    totalAttendance: 0,
    recentAttendance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/members')) return 'members';
    if (location.pathname.includes('/sessions')) return 'sessions';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    const tab = getActiveTab();
    setActiveTab(tab);
    if (tab === 'overview') {
      loadDashboardData();
    }
  }, [location.pathname]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getChariotDashboardStats();
      const data = response?.data || {};
      setStats({
        totalMembers: data.totalMembers || 0,
        totalSessions: data.totalSessions || 0,
        totalAttendance: data.totalAttendance || 0,
        recentAttendance: data.recentAttendance || 0,
      });
    } catch (error) {
      showError('Failed to load dashboard data');
      console.error('Load dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chariotInfo = userType === 'chariot-leader' 
    ? { name: user.chariotName, id: user.chariotId }
    : { names: user.chariotNames, ids: user.chariotIds };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'members', name: 'Members', icon: UsersIcon },
    { id: 'sessions', name: 'Sessions', icon: CalendarDaysIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {userType === 'chariot-leader' ? 'Chariot Leader Dashboard' : 'Chariot Assistant Dashboard'}
          </h1>
          <p className="page-subtitle">
            Welcome, {user?.name}! 
            {userType === 'chariot-leader' 
              ? ` You are leading "${chariotInfo.name}"`
              : ` You are assisting ${chariotInfo.names?.length || 0} chariot(s)`
            }
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'members') {
                    navigate('/chariot/members');
                  } else if (tab.id === 'sessions') {
                    navigate('/chariot/sessions');
                  } else {
                    navigate('/chariot/dashboard');
                  }
                }}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : stats.totalMembers}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <CalendarDaysIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : stats.totalSessions}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : stats.totalAttendance}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoading ? '...' : stats.recentAttendance}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chariot Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Chariot Information</h3>
            {userType === 'chariot-leader' ? (
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Chariot:</span> {chariotInfo.name}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Assisting Chariots:</span>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {chariotInfo.names?.map((name, index) => (
                    <li key={chariotInfo.ids[index]} className="text-sm text-gray-600">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && <ChariotMembersList />}
      {activeTab === 'sessions' && <ChariotSessionsList />}
    </div>
  );
};

export default ChariotDashboard;
