import { useState, useEffect } from 'react';
import { CalendarDaysIcon, EyeIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/apiService';
import { useApp } from '../../contexts/SimpleAppContext';

const ChariotSessionsList = () => {
  const { showError } = useApp();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getChariotSessions();
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
      const response = await apiService.getChariotSession(sessionId);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
          <p className="mt-1 text-sm text-gray-500">No sessions found for your chariot members.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {session.theme || session.name || 'Untitled Session'}
                    </h3>
                    {session.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Session Details */}
                <div className="space-y-2 mb-4">
                  {session.startTime && (
                    <div className="text-sm">
                      <span className="text-gray-600">Date:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                  )}
                  {session.location && (
                    <div className="text-sm">
                      <span className="text-gray-600">Location:</span>{' '}
                      <span className="font-medium text-gray-900">{session.location}</span>
                    </div>
                  )}
                </div>

                {/* Attendance Stats */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <span className="text-gray-600">Chariot Members Attendance:</span>{' '}
                    <span className="font-semibold text-blue-900">
                      {session._count?.attendance || session.attendance?.length || 0}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleViewSession(session.id)}
                  className="btn btn-primary w-full"
                >
                  <EyeIcon className="h-6 w-6 mr-2" />
                  View Attendance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedSession.theme || selectedSession.name || 'Session Details'}
                </h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              {/* Session Info */}
              <div className="mb-6 space-y-2">
                {selectedSession.description && (
                  <p className="text-gray-600">{selectedSession.description}</p>
                )}
                {selectedSession.startTime && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Date:</span> {formatDate(selectedSession.startTime)}
                  </p>
                )}
                {selectedSession.location && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {selectedSession.location}
                  </p>
                )}
              </div>

              {/* Attendance Summary */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Members</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedSession.totalCount || selectedSession.members?.length || 0}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Present</div>
                  <div className="text-2xl font-bold text-green-700">
                    {selectedSession.presentCount || selectedSession.members?.filter(m => m.status === 'present').length || 0}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Absent</div>
                  <div className="text-2xl font-bold text-red-700">
                    {selectedSession.absentCount || selectedSession.members?.filter(m => m.status === 'absent').length || 0}
                  </div>
                </div>
              </div>

              {/* Attendance List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Chariot Members ({selectedSession.totalCount || selectedSession.members?.length || 0})
                </h4>
                {selectedSession.members && selectedSession.members.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Checked In At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedSession.members.map((member) => (
                          <tr key={member.id} className={member.status === 'absent' ? 'bg-red-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {member.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {member.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                    No chariot members found
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
