import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/SimpleAppContext';
import apiService from '../../services/apiService';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UsersIcon,
  PresentationChartLineIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const ReportsPage = () => {
  const { sessions, members, loading } = useApp();
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('30');
  const [selectedSession, setSelectedSession] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await apiService.getAnalytics({ period: dateRange });
      if (response.success && response.data) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Use real analytics data if available, otherwise fall back to filtered sessions
  const totalMembers = analyticsData?.summary?.activeMembers || members.length;
  const totalSessions = analyticsData?.summary?.totalSessions || sessions.length;
  const totalCheckins = analyticsData?.summary?.recentAttendance || 0;
  const averageAttendance = analyticsData?.summary?.avgAttendancePerSession || 0;

  // Recent sessions from analytics or filtered sessions
  const recentSessions = analyticsData?.recentSessions || sessions
    .filter(session => {
      const sessionDate = new Date(session.startTime);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
      const withinDateRange = sessionDate >= cutoffDate;
      const matchesSession = selectedSession === '' || session.id === selectedSession;
      return withinDateRange && matchesSession;
    })
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 10);

  // Active members from analytics
  const activeMembersCount = analyticsData?.summary?.activeMembers || members.filter(m => m.isActive).length;
  const inactiveMembersCount = totalMembers - activeMembersCount;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleExportReport = () => {
    // Export filtered data
    const reportData = {
      type: reportType,
      dateRange,
      selectedSession: selectedSession ? sessions.find(s => s.id === parseInt(selectedSession))?.theme : 'All Sessions',
      generatedAt: new Date().toISOString(),
      filters: {
        dateRange: `${dateRange} days`,
        sessionFilter: selectedSession || 'All',
      },
      data: {
        totalMembers,
        totalSessions,
        totalCheckins,
        averageAttendance,
        sessions: recentSessions,
        members: activeMembers.length,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              View attendance statistics and generate reports
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleExportReport}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
              Export Report
            </button>
          </div>
        </div>

        {/* Report Controls */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="attendance">Attendance Overview</option>
                <option value="sessions">Session Details</option>
                <option value="members">Member Activity</option>
              </select>
            </div>
            <div>
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            <div>
              <label htmlFor="sessionFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Session Filter
              </label>
              <select
                id="sessionFilter"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.theme}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Members
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalMembers}
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
                    <CalendarIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Sessions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalSessions}
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
                    <ChartBarIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Check-ins
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {totalCheckins}
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
                    <PresentationChartLineIcon className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Avg. Attendance
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {averageAttendance}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Sessions</h3>
              <div className="space-y-4">
                {recentSessions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No sessions found</p>
                ) : (
                  recentSessions.map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{session.theme || session.session?.theme}</h4>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDate(session.date || session.startTime)} at {formatTime(session.date || session.startTime)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-medium text-gray-900">
                            {session.attendanceCount || session.checkedInCount || 0}
                          </div>
                          <div className="text-sm text-gray-500">attendees</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Member Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Member Activity</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-green-800">Active Members</div>
                    <div className="text-xs text-green-600">Attended in last 30 days</div>
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    {activeMembers.length}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-yellow-800">Inactive Members</div>
                    <div className="text-xs text-yellow-600">No recent attendance</div>
                  </div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {inactiveMembers.length}
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-blue-800">Attendance Rate</div>
                    <div className="text-xs text-blue-600">Overall participation</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    {totalMembers > 0 ? Math.round((activeMembers.length / totalMembers) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Trends */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Trends</h3>
            {analyticsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : analyticsData?.charts?.attendanceByDay ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Showing data for: {analyticsData.period}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analyticsData.charts.attendanceByDay)
                    .sort(([a], [b]) => new Date(b) - new Date(a))
                    .slice(0, 8)
                    .map(([date, count]) => (
                      <div key={date} className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500">{formatDate(date)}</div>
                        <div className="text-lg font-semibold text-gray-900">{count}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No attendance data available for the selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;