import { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/apiService';
import {
  PlusIcon,
  QrCodeIcon,
  ClockIcon,
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  PlayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import QRCodeModal from '../../components/admin/QRCodeModal';

const SessionsPage = () => {
  const navigate = useNavigate();
  const { sessions, fetchSessions, loading, showSuccess, showError } = useApp();
  const { userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    // Fetch sessions on mount - use cache for instant display, then refresh in background
    if (sessions.length === 0) {
      // If no cached data, fetch immediately
      fetchSessions(false);
    } else {
      // If cached data exists, show it immediately and refresh in background
      fetchSessions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditSession = (session) => {
    navigate('/admin/sessions/new', { state: { session } });
  };

  const handleCreateSession = () => {
    navigate('/admin/sessions/new');
  };

  const handleShowQRCode = (session) => {
    setSelectedSession(session);
    setShowQRModal(true);
  };

  const handleViewAttendance = (session) => {
    navigate(`/admin/sessions/${session.id}/attendance`);
  };

  const handleViewChariotAttendance = (session) => {
    navigate(`/admin/sessions/${session.id}/chariot-attendance`);
  };

  const handleDeleteSession = async (session) => {
    if (!isAdmin) return;
    
    const confirmMessage = session.attendanceCount > 0
      ? `This session has ${session.attendanceCount} attendance record(s). It will be deactivated (not deleted) to preserve attendance data. Continue?`
      : 'Are you sure you want to delete this session?';
    
    if (window.confirm(confirmMessage)) {
      try {
        await apiService.deleteSession(session.id);
        showSuccess('Session deleted successfully!');
        fetchSessions(true); // Force refresh the list
      } catch (error) {
        console.error('Failed to delete session:', error);
        showError('Failed to delete session. Please try again.');
      }
    }
  };

  const getSessionStatus = (session) => {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = session.endTime ? new Date(session.endTime) : null;

    if (endTime && now > endTime) {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' };
    } else if (now >= startTime && (!endTime || now <= endTime)) {
      return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
    } else if (now < startTime) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    }
    return { status: 'unknown', label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
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

  const activeSessions = sessions.filter(s => getSessionStatus(s).status === 'active');
  const upcomingSessions = sessions.filter(s => getSessionStatus(s).status === 'upcoming');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Session Management</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-600">
            Create and manage church sessions with QR code check-ins
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleCreateSession}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Create Session</span>
            <span className="sm:hidden">Create</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-5 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Sessions
                  </dt>
                  <dd className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                    {sessions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <PlayIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Sessions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {activeSessions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Upcoming Sessions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {upcomingSessions.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <UsersIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Check-ins
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.reduce((total, session) => total + (session.attendanceCount || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Sessions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Sessions</h3>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdmin ? 'Get started by creating a new session.' : 'No sessions available yet.'}
              </p>
              {isAdmin && (
                <div className="mt-6">
                  <button
                    onClick={handleCreateSession}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Create Session
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const status = getSessionStatus(session);
                return (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">{session.theme}</h4>
                          <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{formatDateTime(session.startTime)}</span>
                          </div>
                          {session.endTime && (
                            <div className="flex items-center">
                              <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                              <span className="truncate">Ends {formatDateTime(session.endTime)}</span>
                            </div>
                          )}
                          {session.location && (
                            <div className="flex items-start">
                              <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0 mt-0.5" />
                              <span className="truncate">{session.location}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 flex-shrink-0" />
                            {session.attendanceCount || 0} checked in
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleViewAttendance(session)}
                          className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
                        >
                          <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">View Attendance</span>
                          <span className="sm:hidden">View</span>
                        </button>
                        <button
                          onClick={() => handleViewChariotAttendance(session)}
                          className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
                          title="View Chariot Attendance"
                        >
                          <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">Chariots</span>
                          <span className="sm:hidden">Chariots</span>
                        </button>
                        <button
                          onClick={() => handleShowQRCode(session)}
                          className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
                        >
                          <QrCodeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">QR Code</span>
                          <span className="sm:hidden">QR</span>
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditSession(session)}
                              className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
                              title="Edit Session"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session)}
                              className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-red-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 touch-manipulation"
                              title="Delete Session"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && selectedSession && (
        <QRCodeModal
          session={selectedSession}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};

export default SessionsPage;