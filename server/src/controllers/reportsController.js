const prisma = require('../config/database');
const XLSX = require('xlsx');

/**
 * Get session attendance report
 */
const getSessionReport = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        isActive: true,
        attendance: {
          select: {
            id: true,
            checkedInAt: true,
            ipAddress: true,
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { checkedInAt: 'asc' },
        },
        _count: {
          select: { attendance: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Calculate additional statistics
    const totalMembers = await prisma.member.count({ where: { isActive: true } });
    const attendanceRate = totalMembers > 0 ? ((session._count.attendance / totalMembers) * 100).toFixed(1) : 0;

    // Group attendance by hour for timeline
    const attendanceByHour = {};
    session.attendance.forEach(record => {
      const hour = new Date(record.checkedInAt).getHours();
      attendanceByHour[hour] = (attendanceByHour[hour] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          theme: session.theme,
          startTime: session.startTime,
          endTime: session.endTime,
          createdAt: session.createdAt,
          isActive: session.isActive,
        },
        statistics: {
          totalAttendance: session._count.attendance,
          totalMembers,
          attendanceRate: parseFloat(attendanceRate),
          attendanceByHour,
        },
        attendance: session.attendance,
      },
    });

  } catch (error) {
    console.error('Get session report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session report',
    });
  }
};

/**
 * Export session attendance to Excel/CSV
 */
const exportAttendance = async (req, res) => {
  try {
    const { sessionId, format = 'xlsx', includeInactive = false } = req.query;

    let whereClause = {};
    let sessionData = null;

    if (sessionId) {
      // Single session export
      whereClause.sessionId = parseInt(sessionId);
      
      sessionData = await prisma.session.findUnique({
        where: { id: parseInt(sessionId) },
        select: { id: true, theme: true, startTime: true },
      });

      if (!sessionData) {
        return res.status(404).json({
          error: 'Session not found',
          message: 'Session with the specified ID does not exist',
        });
      }
    }

    // Build member filter
    const memberWhere = includeInactive === 'true' ? {} : { isActive: true };

    // Get attendance data
    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      select: {
        id: true,
        checkedInAt: true,
        ipAddress: true,
        session: {
          select: {
            id: true,
            theme: true,
            startTime: true,
            endTime: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { session: { startTime: 'desc' } },
        { checkedInAt: 'asc' },
      ],
    });

    // Prepare data for export
    const exportData = attendanceRecords.map(record => ({
      'Session ID': record.session.id,
      'Session Theme': record.session.theme,
      'Session Date': new Date(record.session.startTime).toLocaleDateString(),
      'Session Start Time': new Date(record.session.startTime).toLocaleTimeString(),
      'Member ID': record.member.id,
      'Member Name': record.member.name,
      'Email': record.member.email,
      'Phone': record.member.phone || '',
      'Member Status': record.member.isActive ? 'Active' : 'Inactive',
      'Check-in Time': new Date(record.checkedInAt).toLocaleString(),
      'Check-in Date': new Date(record.checkedInAt).toLocaleDateString(),
      'Check-in Hour': new Date(record.checkedInAt).getHours(),
      'IP Address': record.ipAddress || '',
    }));

    if (exportData.length === 0) {
      return res.status(404).json({
        error: 'No data found',
        message: 'No attendance records found for the specified criteria',
      });
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const sessionPrefix = sessionData ? `session-${sessionData.id}-` : 'all-sessions-';
    const filename = `attendance-${sessionPrefix}${timestamp}.${format}`;

    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape CSV values that contain commas, quotes, or newlines
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

    } else {
      // Generate Excel
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();

      // Set column widths
      worksheet['!cols'] = [
        { width: 12 }, // Session ID
        { width: 30 }, // Session Theme
        { width: 15 }, // Session Date
        { width: 15 }, // Session Start Time
        { width: 12 }, // Member ID
        { width: 25 }, // Member Name
        { width: 30 }, // Email
        { width: 15 }, // Phone
        { width: 12 }, // Member Status
        { width: 20 }, // Check-in Time
        { width: 15 }, // Check-in Date
        { width: 12 }, // Check-in Hour
        { width: 15 }, // IP Address
      ];

      const sheetName = sessionData ? sessionData.theme.substring(0, 30) : 'Attendance Report';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    }

  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export attendance data',
    });
  }
};

/**
 * Get analytics dashboard data
 */
const getAnalytics = async (req, res) => {
  try {
    const { period = '30', fromDate, toDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        checkedInAt: {
          gte: new Date(fromDate),
          lte: new Date(toDate),
        },
      };
    } else {
      const days = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = {
        checkedInAt: { gte: startDate },
      };
    }

    // Get comprehensive analytics
    const [
      totalMembers,
      activeMembers,
      totalSessions,
      activeSessions,
      upcomingSessions,
      totalAttendance,
      recentAttendance,
      topMembers,
      sessionStats,
      attendanceByDay,
      attendanceByHour,
      memberEngagement
    ] = await Promise.all([
      // Total members
      prisma.member.count(),
      
      // Active members
      prisma.member.count({ where: { isActive: true } }),
      
      // Total sessions
      prisma.session.count(),
      
      // Active sessions (currently ongoing)
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { lte: new Date() },
          endTime: { gte: new Date() },
        },
      }),
      
      // Upcoming sessions
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { gt: new Date() },
        },
      }),
      
      // Total attendance
      prisma.attendance.count(),
      
      // Recent attendance (based on date filter)
      prisma.attendance.count({ where: dateFilter }),
      
      // Top members by attendance
      prisma.member.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: { attendance: true },
          },
        },
        orderBy: { attendance: { _count: 'desc' } },
        take: 10,
      }),
      
      // Session statistics
      prisma.session.findMany({
        select: {
          id: true,
          theme: true,
          startTime: true,
          isActive: true,
          _count: {
            select: { attendance: true },
          },
        },
        orderBy: { startTime: 'desc' },
        take: 10,
      }),
      
      // Attendance by day (last 30 days)
      prisma.attendance.groupBy({
        by: ['checkedInAt'],
        where: {
          checkedInAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      }),
      
      // Attendance by hour of day
      prisma.attendance.groupBy({
        by: ['checkedInAt'],
        where: dateFilter,
        _count: true,
      }),
      
      // Member engagement (members with at least one attendance)
      prisma.member.count({
        where: {
          isActive: true,
          attendance: { some: {} },
        },
      }),
    ]);

    // Process attendance by day
    const dailyStats = {};
    attendanceByDay.forEach(record => {
      const date = new Date(record.checkedInAt).toISOString().split('T')[0];
      dailyStats[date] = (dailyStats[date] || 0) + record._count;
    });

    // Process attendance by hour
    const hourlyStats = {};
    attendanceByHour.forEach(record => {
      const hour = new Date(record.checkedInAt).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + record._count;
    });

    // Calculate engagement rate
    const engagementRate = activeMembers > 0 ? ((memberEngagement / activeMembers) * 100).toFixed(1) : 0;
    
    // Calculate average attendance per session
    const avgAttendancePerSession = totalSessions > 0 ? (totalAttendance / totalSessions).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalMembers,
          activeMembers,
          totalSessions,
          activeSessions,
          upcomingSessions,
          totalAttendance,
          recentAttendance,
          engagementRate: parseFloat(engagementRate),
          avgAttendancePerSession: parseFloat(avgAttendancePerSession),
        },
        charts: {
          attendanceByDay: dailyStats,
          attendanceByHour: hourlyStats,
        },
        topMembers: topMembers.map(member => ({
          id: member.id,
          name: member.name,
          email: member.email,
          attendanceCount: member._count.attendance,
        })),
        recentSessions: sessionStats.map(session => ({
          id: session.id,
          theme: session.theme,
          date: session.startTime,
          isActive: session.isActive,
          attendanceCount: session._count.attendance,
        })),
        period: fromDate && toDate ? `${fromDate} to ${toDate}` : `Last ${period} days`,
      },
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve analytics data',
    });
  }
};

/**
 * Get member attendance history
 */
const getMemberAttendance = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { fromDate, toDate, limit = 50 } = req.query;

    const member = await prisma.member.findUnique({
      where: { id: parseInt(memberId) },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!member) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    // Build date filter
    let dateFilter = {};
    if (fromDate && toDate) {
      dateFilter = {
        session: {
          startTime: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        },
      };
    }

    // Get attendance history
    const attendance = await prisma.attendance.findMany({
      where: {
        memberId: parseInt(memberId),
        ...dateFilter,
      },
      select: {
        id: true,
        checkedInAt: true,
        session: {
          select: {
            id: true,
            theme: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
      take: parseInt(limit),
    });

    // Get attendance statistics
    const totalAttendance = await prisma.attendance.count({
      where: { memberId: parseInt(memberId) },
    });

    const recentAttendance = await prisma.attendance.count({
      where: {
        memberId: parseInt(memberId),
        checkedInAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        member,
        statistics: {
          totalAttendance,
          recentAttendance,
        },
        attendance,
      },
    });

  } catch (error) {
    console.error('Get member attendance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve member attendance',
    });
  }
};

/**
 * Get attendance trends and predictions
 */
const getAttendanceTrends = async (req, res) => {
  try {
    const { period = '90' } = req.query;
    const days = parseInt(period);
    
    // Get attendance data for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendanceData = await prisma.attendance.findMany({
      where: {
        checkedInAt: { gte: startDate },
      },
      select: {
        checkedInAt: true,
        session: {
          select: {
            startTime: true,
            theme: true,
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    // Group by week
    const weeklyTrends = {};
    attendanceData.forEach(record => {
      const weekStart = getWeekStart(new Date(record.checkedInAt));
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyTrends[weekKey] = (weeklyTrends[weekKey] || 0) + 1;
    });

    // Group by day of week
    const dayOfWeekTrends = {};
    attendanceData.forEach(record => {
      const dayOfWeek = new Date(record.checkedInAt).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      dayOfWeekTrends[dayName] = (dayOfWeekTrends[dayName] || 0) + 1;
    });

    // Calculate average attendance per week
    const weekCount = Object.keys(weeklyTrends).length;
    const totalAttendance = Object.values(weeklyTrends).reduce((sum, count) => sum + count, 0);
    const avgWeeklyAttendance = weekCount > 0 ? (totalAttendance / weekCount).toFixed(1) : 0;

    // Get recent sessions for context
    const recentSessions = await prisma.session.findMany({
      where: {
        startTime: { gte: startDate },
      },
      select: {
        id: true,
        theme: true,
        startTime: true,
        _count: {
          select: { attendance: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        trends: {
          weekly: weeklyTrends,
          dayOfWeek: dayOfWeekTrends,
        },
        statistics: {
          avgWeeklyAttendance: parseFloat(avgWeeklyAttendance),
          totalAttendance,
          weekCount,
          period: `Last ${days} days`,
        },
        recentSessions,
      },
    });

  } catch (error) {
    console.error('Get attendance trends error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve attendance trends',
    });
  }
};

/**
 * Helper function to get the start of the week (Sunday)
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

module.exports = {
  getSessionReport,
  exportAttendance,
  getAnalytics,
  getMemberAttendance,
  getAttendanceTrends,
};