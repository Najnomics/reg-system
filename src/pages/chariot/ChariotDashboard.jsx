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
import ChapelMembersList from '../../components/chariot/ChapelMembersList';
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
    totalChapelMembers: 0,
    totalChariotMembers: 0,
    totalWorkers: 0,
    totalInvitees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/members')) return 'members';
    if (location.pathname.includes('/sessions')) return 'sessions';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState(getActiveTab());
  const [membersSubTab, setMembersSubTab] = useState('chariot'); // 'chariot' or 'chapel'

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
      // Force refresh on page load to get latest data
      const response = await apiService.getChariotDashboardStats(true);
      const data = response?.data || {};
      setStats({
        totalMembers: data.totalMembers || 0,
        totalSessions: data.totalSessions || 0,
        totalAttendance: data.totalAttendance || 0,
        recentAttendance: data.recentAttendance || 0,
        totalChapelMembers: data.totalChapelMembers || 0,
        totalChariotMembers: data.totalChariotMembers || 0,
        totalWorkers: data.totalWorkers || 0,
        totalInvitees: data.totalInvitees || 0,
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
  const isChapelLeader = userType === 'chariot-leader' && user?.isChapelLeader;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'members', name: 'Members', icon: UsersIcon },
    { id: 'sessions', name: 'Sessions', icon: CalendarDaysIcon },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
            {userType === 'chariot-leader' ? 'Chariot Leader Dashboard' : 'Chariot Assistant Dashboard'}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600 break-words">
            Welcome, {user?.name}!
          </p>
          {userType === 'chariot-leader' && (
            <div className="mt-2 space-y-1">
              <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                Chariot: {chariotInfo.name}
              </p>
              {user?.isChapelLeader && user?.chapelNames && user.chapelNames.length > 0 && (
                <p className="text-sm sm:text-base font-medium text-gray-900 break-words">
                  Chapel(s): {user.chapelNames.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
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
                  flex items-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {isChapelLeader ? (
              <>
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 sm:p-3">
                      <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Chapel Members</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalChapelMembers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 sm:p-3">
                      <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Chariot Members</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalChariotMembers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-amber-100 rounded-md p-2 sm:p-3">
                      <ClipboardDocumentCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Workers</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalWorkers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-2 sm:p-3">
                      <CalendarDaysIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Invitees</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalInvitees}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 sm:p-3">
                      <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Members</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalMembers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 rounded-md p-2 sm:p-3">
                      <CalendarDaysIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Sessions</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalSessions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 sm:p-3">
                      <ClipboardDocumentCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Attendance</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.totalAttendance}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-orange-100 rounded-md p-2 sm:p-3">
                      <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Recent (7 days)</p>
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stats.recentAttendance}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Leadership Information */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Leadership Information</h3>
            {userType === 'chariot-leader' ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Chariot Leadership</p>
                  <p className="text-sm text-blue-800 break-words">
                    You are leading: <span className="font-semibold">{chariotInfo.name}</span>
                  </p>
                </div>
                {user?.isChapelLeader && user?.chapelNames && user.chapelNames.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 mb-1">Chapel Leadership</p>
                    <p className="text-sm text-purple-800 break-words">
                      You are leading: <span className="font-semibold">{user.chapelNames.join(', ')}</span>
                    </p>
                    <p className="text-xs text-purple-700 mt-2">
                      You can view attendance for all members, invitees, and workers in your chapel(s)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Assisting Chariots:</span>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {chariotInfo.names?.map((name, index) => (
                    <li key={chariotInfo.ids[index]} className="text-sm text-gray-600 break-words">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4 sm:space-y-6">
          {userType === 'chariot-leader' && user?.isChapelLeader && (
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-8">
                <button
                  onClick={() => setMembersSubTab('chariot')}
                  className={`
                    py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                    ${membersSubTab === 'chariot'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  Chariot Members
                </button>
                <button
                  onClick={() => setMembersSubTab('chapel')}
                  className={`
                    py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                    ${membersSubTab === 'chapel'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  Chapel Members
                </button>
              </nav>
            </div>
          )}
          {membersSubTab === 'chariot' ? (
            <ChariotMembersList />
          ) : (
            userType === 'chariot-leader' && user?.isChapelLeader ? (
              <ChapelMembersList />
            ) : (
              <ChariotMembersList />
            )
          )}
        </div>
      )}
      {activeTab === 'sessions' && <ChariotSessionsList />}
    </div>
  );
};

export default ChariotDashboard;
