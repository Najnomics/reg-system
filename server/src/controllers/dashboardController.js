const prisma = require('../config/database');

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const currentTime = new Date();
    const todayStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get all statistics in parallel for better performance
    const [
      totalMembers,
      activeMembers,
      totalSessions,
      activeSessions,
      upcomingSessions,
      todaysAttendance,
      recentAttendance,
    ] = await Promise.all([
      // Total members count (only active members)
      prisma.member.count({
        where: { isActive: true },
      }),

      // Active members count (same as total for consistency)
      prisma.member.count({
        where: { isActive: true },
      }),

      // Total sessions
      prisma.session.count(),

      // Active sessions (currently ongoing)
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime },
        },
      }),

      // Upcoming sessions (future sessions)
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { gt: currentTime },
        },
      }),

      // Today's attendance
      prisma.attendance.count({
        where: {
          checkedInAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      // Recent attendance records with member info for activity feed
      prisma.attendance.findMany({
        take: 5,
        orderBy: { checkedInAt: 'desc' },
        include: {
          member: {
            select: { name: true },
          },
          session: {
            select: { theme: true },
          },
        },
      }),
    ]);

    // Calculate attendance rate (today's attendance / active members)
    const attendanceRate = activeMembers > 0 ? Math.round((todaysAttendance / activeMembers) * 100) : 0;

    // Get recent sessions for activity feed
    const recentSessions = await prisma.session.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        theme: true,
        createdAt: true,
      },
    });

    // Format recent activity
    const recentActivity = [];

    // Add recent attendance records
    if (recentAttendance && recentAttendance.length > 0) {
      recentAttendance.forEach(record => {
        if (record && record.member && record.session) {
          const timeAgo = getTimeAgo(record.checkedInAt);
          recentActivity.push({
            id: `attendance-${record.id}`,
            type: 'check-in',
            message: `${record.member.name} checked in to ${record.session.theme}`,
            time: timeAgo,
            color: 'green',
          });
        }
      });
    }

    // Add recent sessions
    if (recentSessions && recentSessions.length > 0) {
      recentSessions.forEach(session => {
        if (session) {
          const timeAgo = getTimeAgo(session.createdAt);
          recentActivity.push({
            id: `session-${session.id}`,
            type: 'session-created',
            message: `New session "${session.theme}" created`,
            time: timeAgo,
            color: 'blue',
          });
        }
      });
    }

    // Sort by most recent first and take top 5
    const activityFeed = recentActivity.slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          activeSessions: activeSessions || 0,
          upcomingSessions: upcomingSessions || 0,
          todaysAttendance: todaysAttendance || 0,
          attendanceRate,
        },
        recentActivity: activityFeed,
        timestamp: currentTime.toISOString(),
      },
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard statistics',
    });
  }
};

/**
 * Helper function to calculate time ago
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
};

module.exports = {
  getDashboardStats,
};