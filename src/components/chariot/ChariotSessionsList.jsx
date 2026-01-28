import { useState, useEffect, useMemo } from 'react';
import { CalendarDaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';

const ChariotSessionsList = () => {
  const { showError } = useApp();
  const { user, userType } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionViewType, setSessionViewType] = useState('chariot'); // 'chariot' or 'chapel'

  const isChapelLeader = userType === 'chariot-leader' && user?.isChapelLeader;

  useEffect(() => {
    loadSessions();
  }, [sessionViewType, isChapelLeader]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const type = isChapelLeader && sessionViewType === 'chapel' ? 'chapel-only' : 'chariot-only';
      const response = await apiService.getChariotSessions(type);
      setSessions(response?.data?.sessions || []);
    } catch (error) {
      showError('Failed to load sessions');
      console.error('Load sessions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = async (sessionId) => {
    try {
      // Determine which type to fetch based on current view
      const type = (userType === 'chariot-leader' && user?.isChapelLeader && sessionViewType === 'chapel') 
        ? 'chapel-only' 
        : 'chariot-only';
      const response = await apiService.getChariotSession(sessionId, type);
      setSelectedSession(response?.data?.session);
    } catch (error) {
      showError('Failed to load session details');
      console.error('Load session error:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChapelRole = (role) => {
    if (role === 'INVITEE') return 'Invitee';
    if (role === 'WORKER') return 'Worker';
    if (role === 'CHAPEL_LEADER') return 'Chapel Leader';
    if (role === 'MEMBER') return 'Member';
    return 'Unassigned';
  };

  const roleBreakdown = useMemo(() => {
    const summary = {
      invitees: { total: 0, present: 0, absent: 0 },
      members: { total: 0, present: 0, absent: 0 },
      workers: { total: 0, present: 0, absent: 0 },
    };

    if (!selectedSession?.members || selectedSession.members.length === 0) {
      return summary;
    }

    selectedSession.members.forEach((member) => {
      const role = member.chapelRole;
      const bucket =
        role === 'INVITEE' ? summary.invitees : role === 'WORKER' ? summary.workers : summary.members;
      bucket.total += 1;
      if (member.status === 'present') {
        bucket.present += 1;
      } else {
        bucket.absent += 1;
      }
    });

    return summary;
  }, [selectedSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Tabs for Chariot/Chapel views (only show if user is chapel leader) */}
      {isChapelLeader && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setSessionViewType('chariot')}
              className={`
                py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                ${sessionViewType === 'chariot'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Chariot Attendance
            </button>
            <button
              onClick={() => setSessionViewType('chapel')}
              className={`
                py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
                ${sessionViewType === 'chapel'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Chapel Attendance
            </button>
          </nav>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-white rounded-lg border border-gray-200 px-4">
          <CalendarDaysIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
          <p className="mt-1 text-sm text-gray-500">No sessions found for your chariot members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                      {session.theme || session.name || 'Untitled Session'}
                    </h3>
                    {session.description && (
                      <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2 break-words">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Details */}
                <div className="space-y-2 mb-3 sm:mb-4">
                  {session.startTime && (
                    <div className="text-xs sm:text-sm">
                      <span className="text-gray-600">Date:</span>{' '}
                      <span className="font-medium text-gray-900 break-words">
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                  )}
                  {session.location && (
                    <div className="text-xs sm:text-sm">
                      <span className="text-gray-600">Location:</span>{' '}
                      <span className="font-medium text-gray-900 break-words">{session.location}</span>
                    </div>
                  )}
                </div>

                {/* Attendance Stats */}
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs sm:text-sm">
                    <span className="text-gray-600">
                      {isChapelLeader && sessionViewType === 'chapel' 
                        ? 'Chapel Members Attendance:' 
                        : 'Chariot Members Attendance:'}
                    </span>{' '}
                    <span className="font-semibold text-blue-900">
                      {session._count?.attendance || session.attendance?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleViewSession(session.id)}
                  className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
                >
                  <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span>View Attendance</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 break-words pr-2">
                  {selectedSession.theme || selectedSession.name || 'Session Details'}
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0 touch-manipulation"
                  aria-label="Close"
                >
                  <span className="text-xl sm:text-2xl">&times;</span>
                </button>
              </div>

              {/* Session Info */}
              <div className="mb-4 sm:mb-6 space-y-2">
                {selectedSession.description && (
                  <p className="text-sm sm:text-base text-gray-600 break-words">{selectedSession.description}</p>
                )}
                {selectedSession.startTime && (
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    <span className="font-medium">Date:</span> {formatDate(selectedSession.startTime)}
                  </p>
                )}
                {selectedSession.location && (
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    <span className="font-medium">Location:</span> {selectedSession.location}
                  </p>
                )}
              </div>

              {/* Attendance Summary */}
              <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600">Total Members</div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">
                    {selectedSession.totalCount || selectedSession.members?.length || 0}
                  </div>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600">Present</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-700">
                    {selectedSession.presentCount || selectedSession.members?.filter(m => m.status === 'present').length || 0}
                  </div>
                </div>
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-xs sm:text-sm text-gray-600">Absent</div>
                  <div className="text-xl sm:text-2xl font-bold text-red-700">
                    {selectedSession.absentCount || selectedSession.members?.filter(m => m.status === 'absent').length || 0}
                  </div>
                </div>
              </div>

              {/* Role Breakdown */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">
                  {isChapelLeader && sessionViewType === 'chapel'
                    ? 'Chapel Role Breakdown'
                    : 'Chariot Role Breakdown'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-indigo-50 border border-indigo-100 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-indigo-700">Invitees</div>
                    <div className="text-lg sm:text-xl font-semibold text-indigo-900">
                      {roleBreakdown.invitees.total}
                    </div>
                    <div className="text-xs text-indigo-800">
                      {roleBreakdown.invitees.present} present • {roleBreakdown.invitees.absent} absent
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-green-700">Members</div>
                    <div className="text-lg sm:text-xl font-semibold text-green-900">
                      {roleBreakdown.members.total}
                    </div>
                    <div className="text-xs text-green-800">
                      {roleBreakdown.members.present} present • {roleBreakdown.members.absent} absent
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 sm:p-4 rounded-lg">
                    <div className="text-xs sm:text-sm text-amber-700">Workers</div>
                    <div className="text-lg sm:text-xl font-semibold text-amber-900">
                      {roleBreakdown.workers.total}
                    </div>
                    <div className="text-xs text-amber-800">
                      {roleBreakdown.workers.present} present • {roleBreakdown.workers.absent} absent
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance List */}
              <div>
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  {isChapelLeader && sessionViewType === 'chapel' 
                    ? `Chapel Members (${selectedSession.totalCount || selectedSession.members?.length || 0})`
                    : `Chariot Members (${selectedSession.totalCount || selectedSession.members?.length || 0})`}
                </h4>
                {selectedSession.members && selectedSession.members.length > 0 ? (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                      {selectedSession.members.map((member) => (
                        <div key={member.id} className={`p-3 rounded-lg border ${member.status === 'absent' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                              <p className="text-xs text-gray-600 truncate mt-1">{member.email}</p>
                              <p className="text-xs text-gray-600 truncate mt-1">
                                Role: {formatChapelRole(member.chapelRole)}
                              </p>
                              <p className="text-xs text-gray-600 truncate mt-1">
                                Chapel: {member.chapel?.name || 'Not assigned'}
                              </p>
                            </div>
                            <div className="ml-2 flex-shrink-0">
                              {member.status === 'present' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Present
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  Absent
                                </span>
                              )}
                            </div>
                          </div>
                          {member.checkedInAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Checked in: {new Date(member.checkedInAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Desktop Table View */}
                    <table className="hidden sm:table min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Role
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Chapel
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Checked In At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedSession.members.map((member) => (
                          <tr key={member.id} className={member.status === 'absent' ? 'bg-red-50' : ''}>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {member.name}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {member.email}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatChapelRole(member.chapelRole)}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {member.chapel?.name || 'Not assigned'}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              {member.status === 'present' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Present
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                  Absent
                                </span>
                              )}
                            </td>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {member.checkedInAt
                                ? new Date(member.checkedInAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    {isChapelLeader && sessionViewType === 'chapel' 
                      ? 'No chapel members found'
                      : 'No chariot members found'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChariotSessionsList;
