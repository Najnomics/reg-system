const prisma = require('../config/database');

/**
 * Get chariot members (filtered for leader/assistant)
 */
const getChariotMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', query } = req.query;
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    let memberIds = [];

    if (req.user.userType === 'chariot-leader') {
      // Get members from the leader's chariot
      const chariotMembers = await prisma.chariotMember.findMany({
        where: { chariotId: req.user.chariotId },
        select: { memberId: true },
      });
      memberIds = chariotMembers.map(cm => cm.memberId);
    } else if (req.user.userType === 'chariot-assistant') {
      // Get members from all chariots the assistant belongs to
      const chariotMembers = await prisma.chariotMember.findMany({
        where: { chariotId: { in: req.user.chariotIds } },
        select: { memberId: true },
      });
      memberIds = [...new Set(chariotMembers.map(cm => cm.memberId))];
    }

    // Build search conditions
    let where = {
      id: { in: memberIds },
      isActive: { not: false },
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Get members and total count
    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          pin: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { attendance: true },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    res.status(200).json({
      success: true,
      data: {
        members,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages,
          hasNext,
          hasPrev,
        },
      },
    });
  } catch (error) {
    console.error('Get chariot members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chariot members',
    });
  }
};

/**
 * Get chariot sessions with attendance filtered by chariot members
 * Optimized with parallel queries and selective field loading
 */
const getChariotSessions = async (req, res) => {
  try {
    // Get member IDs and sessions in parallel for better performance
    const [chariotMembersResult, sessions] = await Promise.all([
      // Get member IDs based on user type
      req.user.userType === 'chariot-leader'
        ? prisma.chariotMember.findMany({
            where: { chariotId: req.user.chariotId },
            select: { memberId: true },
          })
        : prisma.chariotMember.findMany({
            where: { chariotId: { in: req.user.chariotIds } },
            select: { memberId: true },
          }),
      // Get sessions in parallel (without attendance first for faster initial load)
      prisma.session.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          theme: true,
          startTime: true,
          endTime: true,
          location: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const memberIds = req.user.userType === 'chariot-leader'
      ? chariotMembersResult.map(cm => cm.memberId)
      : [...new Set(chariotMembersResult.map(cm => cm.memberId))];

    // If no members, return empty sessions
    if (memberIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { sessions: sessions.map(s => ({ ...s, attendance: [], _count: { attendance: 0 } })) },
      });
    }

    // Get attendance counts for all sessions in parallel
    const attendanceCounts = await Promise.all(
      sessions.map(session =>
        prisma.attendance.count({
          where: {
            sessionId: session.id,
            memberId: { in: memberIds },
          },
        })
      )
    );

    // Get attendance records for sessions (only if needed, can be lazy loaded)
    const sessionsWithAttendance = sessions.map((session, index) => ({
      ...session,
      _count: {
        attendance: attendanceCounts[index],
      },
      attendance: [], // Empty array - can be loaded on demand when viewing details
    }));

    res.status(200).json({
      success: true,
      data: { sessions: sessionsWithAttendance },
    });
  } catch (error) {
    console.error('Get chariot sessions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chariot sessions',
    });
  }
};

/**
 * Get a single session with chariot member attendance
 * Optimized with parallel queries
 */
const getChariotSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Get member IDs and session data in parallel for better performance
    const [chariotMembersResult, session] = await Promise.all([
      // Get member IDs based on user type
      req.user.userType === 'chariot-leader'
        ? prisma.chariotMember.findMany({
            where: { chariotId: req.user.chariotId },
            select: { memberId: true },
          })
        : prisma.chariotMember.findMany({
            where: { chariotId: { in: req.user.chariotIds } },
            select: { memberId: true },
          }),
      // Get session data
      prisma.session.findUnique({
        where: { id },
        select: {
          id: true,
          theme: true,
          startTime: true,
          endTime: true,
          location: true,
          isActive: true,
          createdAt: true,
        },
      }),
    ]);

    const memberIds = req.user.userType === 'chariot-leader'
      ? chariotMembersResult.map(cm => cm.memberId)
      : [...new Set(chariotMembersResult.map(cm => cm.memberId))];

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Get attendance and members in parallel
    const [attendanceRecords, allChariotMembers] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          sessionId: id,
          memberId: { in: memberIds },
        },
        select: {
          memberId: true,
          checkedInAt: true,
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      // Get all chariot members details
      prisma.member.findMany({
        where: {
          id: { in: memberIds },
          isActive: { not: false },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    ]);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Get IDs of members who attended
    const attendedMemberIds = new Set(attendanceRecords.map(a => a.member.id));

    // Separate present and absent members
    const presentMembers = attendanceRecords.map(a => ({
      id: a.member.id,
      name: a.member.name,
      email: a.member.email,
      checkedInAt: a.checkedInAt,
      status: 'present',
    }));

    const absentMembers = allChariotMembers
      .filter(m => !attendedMemberIds.has(m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        checkedInAt: null,
        status: 'absent',
      }));

    // Combine and sort by name
    const allMembers = [...presentMembers, ...absentMembers].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    res.status(200).json({
      success: true,
      data: {
        session: {
          ...session,
          attendance: attendanceRecords, // Keep for backward compatibility
          members: allMembers,
          presentCount: presentMembers.length,
          absentCount: absentMembers.length,
          totalCount: allMembers.length,
        },
      },
    });
  } catch (error) {
    console.error('Get chariot session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chariot session',
    });
  }
};

/**
 * Get dashboard stats for chariot leader/assistant
 */
const getChariotDashboardStats = async (req, res) => {
  try {
    let memberIds = [];
    let chariotIds = [];

    if (req.user.userType === 'chariot-leader') {
      chariotIds = [req.user.chariotId];
      const chariotMembers = await prisma.chariotMember.findMany({
        where: { chariotId: req.user.chariotId },
        select: { memberId: true },
      });
      memberIds = chariotMembers.map(cm => cm.memberId);
    } else if (req.user.userType === 'chariot-assistant') {
      chariotIds = req.user.chariotIds;
      const chariotMembers = await prisma.chariotMember.findMany({
        where: { chariotId: { in: req.user.chariotIds } },
        select: { memberId: true },
      });
      memberIds = [...new Set(chariotMembers.map(cm => cm.memberId))];
    }

    const [
      totalMembers,
      activeMembers,
      totalSessions,
      totalAttendance,
      recentAttendance,
    ] = await Promise.all([
      // Total members in chariot
      prisma.member.count({
        where: {
          id: { in: memberIds },
          isActive: { not: false },
        },
      }),
      // Active members
      prisma.member.count({
        where: {
          id: { in: memberIds },
          isActive: true,
        },
      }),
      // Total sessions
      prisma.session.count({
        where: {
          isActive: true,
        },
      }),
      // Total attendance records for chariot members
      prisma.attendance.count({
        where: {
          memberId: { in: memberIds },
        },
      }),
      // Recent attendance (last 7 days)
      prisma.attendance.count({
        where: {
          memberId: { in: memberIds },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        totalSessions,
        totalAttendance,
        recentAttendance,
        chariotInfo: req.user.userType === 'chariot-leader' 
          ? { id: req.user.chariotId, name: req.user.chariotName }
          : { ids: req.user.chariotIds, names: req.user.chariotNames },
      },
    });
  } catch (error) {
    console.error('Get chariot dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve dashboard stats',
    });
  }
};

module.exports = {
  getChariotMembers,
  getChariotSessions,
  getChariotSession,
  getChariotDashboardStats,
};
