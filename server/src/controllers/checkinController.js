const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { verifyPin } = require('../utils/pinGenerator');

/**
 * Validate session for check-in
 */
const validateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        isActive: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        valid: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        valid: false,
        error: 'Session inactive',
        message: 'This session is no longer active',
      });
    }

    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);

    // Check if current time is within session window
    const withinTimeWindow = now >= startTime && now <= endTime;
    
    // Allow check-in slightly before start time (5 minutes buffer)
    const bufferMinutes = 5;
    const bufferStartTime = new Date(startTime.getTime() - bufferMinutes * 60 * 1000);
    const withinBufferWindow = now >= bufferStartTime && now <= endTime;

    if (!withinBufferWindow) {
      const status = now < bufferStartTime ? 'not_started' : 'expired';
      const message = now < bufferStartTime 
        ? `Check-in opens at ${startTime.toLocaleString()}`
        : `Check-in closed at ${endTime.toLocaleString()}`;

      return res.status(400).json({
        valid: false,
        error: 'Outside check-in window',
        message,
        status,
        session: {
          theme: session.theme,
          startTime: session.startTime,
          endTime: session.endTime,
        },
      });
    }

    res.status(200).json({
      valid: true,
      withinTimeWindow,
      withinBufferWindow,
      session: {
        id: session.id,
        theme: session.theme,
        startTime: session.startTime,
        endTime: session.endTime,
        secretQuestion: session.secretQuestion,
      },
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error',
      message: 'Failed to validate session',
    });
  }
};

/**
 * Verify secret question answer
 */
const verifySecretAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        secretAnswer: true,
        isActive: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        correct: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        correct: false,
        error: 'Session inactive',
        message: 'This session is no longer active',
      });
    }

    // Check time window
    const now = new Date();
    const bufferMinutes = 5;
    const bufferStartTime = new Date(new Date(session.startTime).getTime() - bufferMinutes * 60 * 1000);
    const endTime = new Date(session.endTime);

    if (now < bufferStartTime || now > endTime) {
      return res.status(400).json({
        correct: false,
        error: 'Outside check-in window',
        message: 'Check-in is not currently available for this session',
      });
    }

    // Verify the answer
    const isCorrect = await bcrypt.compare(answer.toLowerCase().trim(), session.secretAnswer);

    if (!isCorrect) {
      return res.status(400).json({
        correct: false,
        error: 'Incorrect answer',
        message: 'The answer provided is incorrect. Please try again.',
      });
    }

    res.status(200).json({
      correct: true,
      message: 'Answer verified successfully',
      session: {
        id: session.id,
        theme: session.theme,
      },
    });

  } catch (error) {
    console.error('Secret answer verification error:', error);
    res.status(500).json({
      correct: false,
      error: 'Internal server error',
      message: 'Failed to verify answer',
    });
  }
};

/**
 * Submit attendance (final check-in step)
 */
const submitAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { pin } = req.body;
    
    // Get client information for logging
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Get session details
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Session inactive',
        message: 'This session is no longer active',
      });
    }

    // Check time window
    const now = new Date();
    const bufferMinutes = 5;
    const bufferStartTime = new Date(new Date(session.startTime).getTime() - bufferMinutes * 60 * 1000);
    const endTime = new Date(session.endTime);

    if (now < bufferStartTime || now > endTime) {
      return res.status(400).json({
        success: false,
        error: 'Outside check-in window',
        message: 'Check-in is not currently available for this session',
      });
    }

    // Find member by PIN
    const member = await prisma.member.findUnique({
      where: { pin },
      select: {
        id: true,
        name: true,
        email: true,
        pinHash: true,
        isActive: true,
      },
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PIN',
        message: 'The PIN provided is not valid',
      });
    }

    if (!member.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Member inactive',
        message: 'Your membership is currently inactive. Please contact administration.',
      });
    }

    // Verify PIN hash (additional security check)
    const isPinValid = await verifyPin(pin, member.pinHash);
    if (!isPinValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PIN',
        message: 'The PIN provided is not valid',
      });
    }

    // Check if already checked in for this session
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        sessionId_memberId: {
          sessionId: parseInt(sessionId),
          memberId: member.id,
        },
      },
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        error: 'Already checked in',
        message: 'You have already checked in for this session',
        attendance: {
          checkedInAt: existingAttendance.checkedInAt,
        },
      });
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        sessionId: parseInt(sessionId),
        memberId: member.id,
        ipAddress,
        userAgent,
      },
      select: {
        id: true,
        checkedInAt: true,
      },
    });

    res.status(201).json({
      success: true,
      message: `Welcome ${member.name}! You have been successfully checked in.`,
      data: {
        member: {
          id: member.id,
          name: member.name,
        },
        session: {
          id: session.id,
          theme: session.theme,
        },
        attendance: {
          id: attendance.id,
          checkedInAt: attendance.checkedInAt,
        },
      },
    });

  } catch (error) {
    console.error('Submit attendance error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Already checked in',
        message: 'You have already checked in for this session',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to record attendance',
    });
  }
};

/**
 * Get session info for check-in (public endpoint)
 */
const getSessionInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        isActive: true,
        _count: {
          select: { attendance: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    const now = new Date();
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    
    // Determine session status
    let status;
    if (!session.isActive) {
      status = 'inactive';
    } else if (now < startTime) {
      status = 'upcoming';
    } else if (now > endTime) {
      status = 'completed';
    } else {
      status = 'active';
    }

    // Check if within check-in window (including buffer)
    const bufferMinutes = 5;
    const bufferStartTime = new Date(startTime.getTime() - bufferMinutes * 60 * 1000);
    const canCheckIn = session.isActive && now >= bufferStartTime && now <= endTime;

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          theme: session.theme,
          startTime: session.startTime,
          endTime: session.endTime,
          secretQuestion: session.secretQuestion,
          status,
          canCheckIn,
          attendanceCount: session._count.attendance,
        },
      },
    });

  } catch (error) {
    console.error('Get session info error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session information',
    });
  }
};

/**
 * Get check-in statistics for a session
 */
const getCheckInStats = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and admin has access
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The requested session does not exist',
      });
    }

    // Get attendance statistics
    const [totalAttendance, attendanceByHour] = await Promise.all([
      // Total attendance count
      prisma.attendance.count({
        where: { sessionId: parseInt(sessionId) },
      }),
      // Attendance grouped by hour
      prisma.attendance.groupBy({
        by: ['checkedInAt'],
        where: { sessionId: parseInt(sessionId) },
        _count: true,
      }),
    ]);

    // Process attendance by hour
    const hourlyStats = {};
    attendanceByHour.forEach(record => {
      const hour = new Date(record.checkedInAt).getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + record._count;
    });

    // Get recent check-ins (last 20)
    const recentCheckIns = await prisma.attendance.findMany({
      where: { sessionId: parseInt(sessionId) },
      select: {
        id: true,
        checkedInAt: true,
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { checkedInAt: 'desc' },
      take: 20,
    });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          theme: session.theme,
          startTime: session.startTime,
          endTime: session.endTime,
        },
        statistics: {
          totalAttendance,
          hourlyStats,
          recentCheckIns,
        },
      },
    });

  } catch (error) {
    console.error('Get check-in stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve check-in statistics',
    });
  }
};

module.exports = {
  validateSession,
  verifySecretAnswer,
  submitAttendance,
  getSessionInfo,
  getCheckInStats,
};