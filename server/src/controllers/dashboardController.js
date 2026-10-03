const prisma = require('../config/database');

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const currentTime = new Date();
    const todayStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const eventId = req.event.id;

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
      // Total members count (active members: isActive !== false, matching frontend filter)
      // This matches the frontend filter: member.isActive !== false
      prisma.member.count({
        where: {
          eventId,
          isActive: {
            not: false,
          },
        },
      }),

      // Active members count (same as total for consistency)
      prisma.member.count({
        where: {
          eventId,
          isActive: {
            not: false,
          },
        },
      }),

      // Total sessions
      prisma.session.count({ where: { eventId } }),

      // Active sessions (currently ongoing)
      prisma.session.count({
        where: {
          eventId,
          isActive: true,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime },
        },
      }),

      // Upcoming sessions (future sessions)
      prisma.session.count({
        where: {
          eventId,
          isActive: true,
          startTime: { gt: currentTime },
        },
      }),

      // Today's attendance
      prisma.attendance.count({
        where: {
          session: { eventId },
          checkedInAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),

      // Recent attendance records with member info for activity feed
      prisma.attendance.findMany({
        where: { session: { eventId } },
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
      where: { eventId },
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

    const [totalCheckins, sessionRows, chapels] = await Promise.all([
      prisma.attendance.count({ where: { session: { eventId } } }),
      prisma.session.findMany({
        where: { eventId },
        orderBy: { startTime: 'desc' },
        take: 12,
        select: {
          id: true,
          theme: true,
          name: true,
          startTime: true,
          _count: { select: { attendance: true } },
        },
      }),
      prisma.chapel.findMany({
        where: { eventId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          _count: { select: { members: { where: { isActive: { not: false } } } } },
        },
      }),
    ]);

    const lastSession = sessionRows.find(
      (s) => new Date(s.startTime) <= currentTime && s._count.attendance > 0
    ) || null;

    const presentByChapel = new Map();
    if (lastSession) {
      const rows = await prisma.attendance.findMany({
        where: { sessionId: lastSession.id },
        select: { member: { select: { chapelId: true } } },
      });
      rows.forEach(({ member }) => {
        if (!member?.chapelId) return;
        presentByChapel.set(member.chapelId, (presentByChapel.get(member.chapelId) || 0) + 1);
      });
    }

    const sessionAttendance = sessionRows
      .slice()
      .reverse()
      .map((s) => ({
        id: s.id,
        label: s.theme || s.name || 'Session',
        startTime: s.startTime,
        count: s._count.attendance,
      }));

    const chapelAttendance = chapels
      .map((c) => {
        const total = c._count.members;
        const present = presentByChapel.get(c.id) || 0;
        return {
          id: c.id,
          name: c.name,
          present,
          total,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);

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
          totalSessions: totalSessions || 0,
          totalCheckins: totalCheckins || 0,
        },
        sessionAttendance,
        chapelAttendance,
        lastSession: lastSession
          ? { id: lastSession.id, label: lastSession.theme || lastSession.name, startTime: lastSession.startTime }
          : null,
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