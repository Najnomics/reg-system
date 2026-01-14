import { useState, useEffect } from 'react';
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
  UserIcon,
  EnvelopeIcon,
  HashtagIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const SessionAttendancePage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showError } = useApp();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'present', 'absent'
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSessionAttendance();
  }, [sessionId]);

  const fetchSessionAttendance = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSessionAttendance(sessionId);
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

  const getFilteredMembers = () => {
    if (!sessionData) return [];
    
    if (filter === 'present') {
      return sessionData.attendance.present;
    } else if (filter === 'absent') {
      return sessionData.attendance.absent;
    } else {
      return [
        ...sessionData.attendance.present,
        ...sessionData.attendance.absent
      ].sort((a, b) => a.name.localeCompare(b.name));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/sessions')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Sessions
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session.theme}</h1>
            <p className="mt-1 text-sm text-gray-500">Session Attendance Details</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Export Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentIcon className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export PDF'}
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Present</p>
                    <p className="text-2xl font-bold text-green-600">{attendance.summary.present}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <XCircleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-900">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{attendance.summary.absent}</p>
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
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Filter tabs">
            {[
              { key: 'all', label: 'All Members', count: attendance.summary.totalMembers },
              { key: 'present', label: 'Present', count: attendance.summary.present },
              { key: 'absent', label: 'Absent', count: attendance.summary.absent },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
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
        <div className="p-6">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No members</h3>
              <p className="mt-1 text-sm text-gray-500">
                No members found for the selected filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`border rounded-lg p-4 ${
                    member.status === 'present' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        member.status === 'present' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {member.status === 'present' ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="text-base font-medium text-gray-900">{member.name}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-sm text-gray-500">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {member.email}
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <HashtagIcon className="h-4 w-4 mr-1" />
                                PIN: {member.pin}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {member.status === 'present' ? (
                        <div>
                          <p className="text-sm font-medium text-green-600">Checked In</p>
                          <p className="text-xs text-gray-500">{formatTime(member.checkedInAt)}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-red-600">Did not attend</p>
                          <p className="text-xs text-gray-400">No check-in recorded</p>
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