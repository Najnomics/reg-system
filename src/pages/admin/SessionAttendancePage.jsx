import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/SimpleAppContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  EnvelopeIcon,
  HashtagIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

const SessionAttendancePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useApp();
  const { userType } = useAuth();
  const isAdmin = userType === 'admin';
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'present', 'absent'
  const [exporting, setExporting] = useState(false);
  const [markingPresent, setMarkingPresent] = useState({}); // Track which member is being marked

  useEffect(() => {
    fetchSessionAttendance();
  }, [sessionId]);

  const fetchSessionAttendance = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSessionAttendance(sessionId);
      console.log('Session attendance response:', response);
      console.log('Session data:', response.data?.session);
      console.log('Present members:', response.data?.attendance?.present?.length || 0);
      console.log('Absent members:', response.data?.attendance?.absent?.length || 0);
      setSessionData(response.data);
    } catch (error) {
      console.error('Failed to fetch session attendance:', error);
      showError(error.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
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

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await apiService.exportSessionAttendanceCSV(sessionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sessionData.session.theme.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      showError('Failed to export attendance as CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const blob = await apiService.exportSessionAttendancePDF(sessionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sessionData.session.theme.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      showError('Failed to export attendance as PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleMarkPresent = async (memberId) => {
    if (!isAdmin) return;
    
    try {
      setMarkingPresent(prev => ({ ...prev, [memberId]: true }));
      await apiService.markMemberPresent(sessionId, memberId);
      showSuccess('Member marked as present successfully');
      // Refresh attendance data
      await fetchSessionAttendance();
    } catch (error) {
      console.error('Failed to mark member as present:', error);
      showError(error.message || 'Failed to mark member as present');
    } finally {
      setMarkingPresent(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const getFilteredMembers = () => {
    if (!sessionData || !sessionData.attendance) return [];
    
    const present = sessionData.attendance.present || [];
    const absent = sessionData.attendance.absent || [];
    
    if (filter === 'present') {
      return present;
    } else if (filter === 'absent') {
      return absent;
    } else {
      // Combine and sort by name
      return [...present, ...absent].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900">Session not found</h3>
        <p className="mt-2 text-sm text-gray-500">
          The session you're looking for doesn't exist or you don't have permission to view it.
        </p>
      </div>
    );
  }

  const { session, attendance } = sessionData;
  const filteredMembers = getFilteredMembers();

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <button
            onClick={() => navigate('/admin/sessions')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation w-fit"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Sessions</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{session.theme}</h1>
            <p className="mt-1 text-sm text-gray-500">Session Attendance Details</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              <ArrowDownTrayIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span>
              <span className="sm:hidden">CSV</span>
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              <DocumentIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export PDF'}</span>
              <span className="sm:hidden">PDF</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            session.status === 'active' ? 'bg-green-100 text-green-800' :
            session.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
            session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Session Details</h3>
            <div className="space-y-3">
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
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Attendance Summary</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                  <div className="ml-2 sm:ml-3 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-900">Present</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{attendance.summary.present}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <XCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
                  <div className="ml-2 sm:ml-3 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-red-900">Absent</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{attendance.summary.absent}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Attendance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{attendance.summary.attendanceRate}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">{attendance.summary.present} of {attendance.summary.totalMembers} members</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max sm:min-w-0" aria-label="Filter tabs">
            {[
              { key: 'all', label: 'All Members', count: attendance.summary.totalMembers },
              { key: 'present', label: 'Present', count: attendance.summary.present },
              { key: 'absent', label: 'Absent', count: attendance.summary.absent },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
                  filter === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs ${
                  filter === tab.key
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Members List */}
        <div className="p-4 sm:p-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members</h3>
              <p className="mt-1 text-sm text-gray-500">
                No members found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-lg p-3 sm:p-4 ${
                    member.status === 'present' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                        member.status === 'present' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {member.status === 'present' ? (
                          <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{member.name}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                          <div className="flex items-center text-xs sm:text-sm text-gray-500">
                            <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          <div className="flex items-center text-xs sm:text-sm text-gray-500">
                            <HashtagIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            PIN: {member.pin}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:text-right gap-2 flex-shrink-0">
                      {member.status === 'present' ? (
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-green-600">Checked In</p>
                          <p className="text-xs text-gray-500">{formatTime(member.checkedInAt)}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start sm:items-end gap-2">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-red-600">Did not attend</p>
                            <p className="text-xs text-gray-400">No check-in recorded</p>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleMarkPresent(member.id)}
                              disabled={markingPresent[member.id]}
                              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                            >
                              <PlusCircleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              {markingPresent[member.id] ? 'Marking...' : 'Mark Present'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionAttendancePage;