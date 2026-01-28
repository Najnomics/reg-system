import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import apiService from '../../services/apiService';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

const SessionChariotAttendancePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedChariots, setExpandedChariots] = useState(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    fetchChariotAttendance();
  }, [sessionId]);

  const fetchChariotAttendance = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSessionChariotAttendance(sessionId);
      console.log('📊 Chariot attendance response:', response);
      console.log('📊 Number of chariots received:', response.data?.chariots?.length);
      console.log('📊 Chariot names:', response.data?.chariots?.map(c => c.name));
      setData(response.data);
      // Expand ALL chariots by default so user can see all details at once
      // Only set once to prevent React StrictMode from resetting it
      if (response.data?.chariots?.length > 0) {
        const allChariotIds = response.data.chariots.map(c => c.id);
        setExpandedChariots(prev => {
          // Only update if not already initialized (prev is empty or hasInitialized is false)
          if (prev.size === 0 || !hasInitialized) {
            return new Set(allChariotIds);
          }
          return prev;
        });
        if (!hasInitialized) {
          setHasInitialized(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chariot attendance:', error);
      showError(error.message || 'Failed to load chariot attendance data');
    } finally {
      setLoading(false);
    }
  };

  const toggleChariot = (chariotId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setExpandedChariots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chariotId)) {
        newSet.delete(chariotId);
      } else {
        newSet.add(chariotId);
      }
      return newSet;
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const normalizedSearch = memberSearch.trim().toLowerCase();
  const chariots = data?.chariots || [];
  const filteredChariots = useMemo(() => {
    if (!normalizedSearch) return chariots;
    return chariots
      .map((chariot) => {
        const filteredMembers = (chariot.members || []).filter((member) => {
          return (
            member?.name?.toLowerCase().includes(normalizedSearch) ||
            member?.email?.toLowerCase().includes(normalizedSearch)
          );
        });
        return { ...chariot, members: filteredMembers };
      })
      .filter((chariot) => chariot.members.length > 0);
  }, [chariots, normalizedSearch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const { session, overallStats } = data;
  
  // Debug logging
  console.log('🎨 Rendering - Number of chariots:', chariots?.length);
  console.log('🎨 Rendering - Chariot names:', chariots?.map(c => c.name));
  console.log('🎨 Rendering - Expanded chariots:', Array.from(expandedChariots));

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate('/admin/sessions')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2 text-sm touch-manipulation"
          >
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Back to Sessions</span>
            <span className="sm:hidden">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            Chariot Attendance Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 break-words">
            {session.theme || 'Session'} - {formatDateTime(session.startTime)}
          </p>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Overall Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Total Chariots</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{overallStats.totalChariots}</div>
          </div>
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Total Members</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{overallStats.totalMembers}</div>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Present</div>
            <div className="text-xl sm:text-2xl font-bold text-green-700">{overallStats.totalPresent}</div>
          </div>
          <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-gray-600">Absent</div>
            <div className="text-xl sm:text-2xl font-bold text-red-700">{overallStats.totalAbsent}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Overall Attendance Rate</span>
            <span className="text-2xl font-bold text-indigo-600">{overallStats.overallAttendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Session Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center text-sm">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="font-medium text-gray-500">Start Time:</span>
            <span className="ml-2 text-gray-900">{formatDateTime(session.startTime)}</span>
          </div>
          <div className="flex items-center text-sm">
            <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
            <span className="font-medium text-gray-500">End Time:</span>
            <span className="ml-2 text-gray-900">{formatDateTime(session.endTime)}</span>
          </div>
          {session.location && (
            <div className="flex items-center text-sm">
              <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="font-medium text-gray-500">Location:</span>
              <span className="ml-2 text-gray-900">{session.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chariots List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Chariots ({filteredChariots.length})
          </h2>
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members by name or email..."
            className="w-full sm:w-80 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          />
        </div>
        {!filteredChariots || filteredChariots.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">No matching members found.</p>
          </div>
        ) : (
          filteredChariots.map((chariot) => {
          const isExpanded = expandedChariots.has(chariot.id);
          return (
            <div key={chariot.id} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Chariot Header */}
              <button
                onClick={(e) => toggleChariot(chariot.id, e)}
                className="w-full px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 transition-colors touch-manipulation"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 mt-1 sm:mt-0">
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{chariot.name}</h3>
                    {chariot.description && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{chariot.description}</p>
                    )}
                    {chariot.leader && (
                      <p className="text-xs text-gray-400 mt-1 break-words">
                        Leader: {chariot.leader?.name || 'Not assigned'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-4 sm:flex sm:items-center sm:space-x-4 sm:space-x-6 w-full sm:w-auto">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-500">Total</div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">{chariot.statistics.total}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-500">Present</div>
                    <div className="text-base sm:text-lg font-bold text-green-700">{chariot.statistics.present}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-500">Absent</div>
                    <div className="text-base sm:text-lg font-bold text-red-700">{chariot.statistics.absent}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-500">Rate</div>
                    <div className="text-base sm:text-lg font-bold text-indigo-600">{chariot.statistics.attendanceRate}%</div>
                  </div>
                </div>
              </button>

              {/* Chariot Members (Expanded) */}
              {isExpanded && (
                <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <div className="mb-3 sm:mb-4">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Members ({chariot.members.length})
                    </h4>
                  </div>
                  {chariot.members.length > 0 ? (
                    <>
                      {/* Mobile Card View */}
                      <div className="block sm:hidden space-y-2">
                        {chariot.members.map((member) => (
                          <div
                            key={member.id}
                            className={`p-3 rounded-lg border ${
                              member.status === 'absent' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                                <p className="text-xs text-gray-600 truncate mt-1">{member.email}</p>
                              </div>
                              <div className="ml-2 flex-shrink-0">
                                {member.status === 'present' ? (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    Present
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                    <XCircleIcon className="h-3 w-3 mr-1" />
                                    Absent
                                  </span>
                                )}
                              </div>
                            </div>
                            {member.checkedInAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Checked in: {formatTime(member.checkedInAt)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
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
                            {chariot.members.map((member) => (
                              <tr
                                key={member.id}
                                className={member.status === 'absent' ? 'bg-red-50' : ''}
                              >
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {member.name}
                                </td>
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {member.email}
                                </td>
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap">
                                  {member.status === 'present' ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                                      <XCircleIcon className="h-4 w-4 mr-1" />
                                      Absent
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 lg:px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                                  {member.checkedInAt
                                    ? formatTime(member.checkedInAt)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      No members in this chariot
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })
        )}
      </div>
    </div>
  );
};

export default SessionChariotAttendancePage;
