const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const qrCodeService = require('../services/qrCodeService');

/**
 * Get all sessions with pagination and filtering
 */
const getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, fromDate, toDate, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build filter conditions
    let where = {};

    if (status) {
      if (status === 'active') {
        const now = new Date();
        where.AND = [
          { isActive: true },
          { startTime: { lte: now } },
          { endTime: { gte: now } },
        ];
      } else if (status === 'upcoming') {
        where.AND = [
          { isActive: true },
          { startTime: { gt: new Date() } },
        ];
      } else if (status === 'completed') {
        where.endTime = { lt: new Date() };
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    if (fromDate) {
      where.startTime = { ...where.startTime, gte: new Date(fromDate) };
    }

    if (toDate) {
      where.endTime = { ...where.endTime, lte: new Date(toDate) };
    }

    // Get sessions and total count
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        select: {
          id: true,
          theme: true,
          startTime: true,
          endTime: true,
          qrCodeData: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { attendance: true },
          },
        },
      }),
      prisma.session.count({ where }),
    ]);

    // Add status to each session
    const now = new Date();
    const sessionsWithStatus = sessions.map(session => ({
      ...session,
      status: getSessionStatus(session, now),
      attendanceCount: session._count.attendance,
    }));

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        sessions: sessionsWithStatus,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve sessions',
    });
  }
};

/**
 * Get a single session by ID
 */
const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        qrCodeData: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        attendance: {
          select: {
            id: true,
            checkedInAt: true,
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { checkedInAt: 'desc' },
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

    // Add session status
    const now = new Date();
    const sessionWithStatus = {
      ...session,
      status: getSessionStatus(session, now),
      attendanceCount: session._count.attendance,
    };

    res.status(200).json({
      success: true,
      data: { session: sessionWithStatus },
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session',
    });
  }
};

/**
 * Create a new session
 */
const createSession = async (req, res) => {
  try {
    const { theme, startTime, endTime, secretQuestion, secretAnswer } = req.body;

    // Validate time window
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start >= end) {
      return res.status(400).json({
        error: 'Invalid time range',
        message: 'End time must be after start time',
      });
    }

    if (end <= now) {
      return res.status(400).json({
        error: 'Invalid time range',
        message: 'End time must be in the future',
      });
    }

    // Hash the secret answer
    const hashedAnswer = await bcrypt.hash(secretAnswer.toLowerCase().trim(), 12);

    // Create session without QR code first
    const session = await prisma.session.create({
      data: {
        theme: theme.trim(),
        startTime: start,
        endTime: end,
        secretQuestion: secretQuestion.trim(),
        secretAnswer: hashedAnswer,
        isActive: true,
      },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate QR code
    const qrData = await qrCodeService.generateSessionQR(session.id);

    // Update session with QR code data
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: { qrCodeData: qrData.url },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        qrCodeData: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Add QR code images and status
    const now = new Date();
    const sessionResponse = {
      ...updatedSession,
      status: getSessionStatus(updatedSession, now),
      qrCode: qrData.dataUrl,
      qrCodeSvg: qrData.svg,
      attendanceCount: 0,
    };

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { session: sessionResponse },
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create session',
    });
  }
};

/**
 * Update a session
 */
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { theme, startTime, endTime, secretQuestion, secretAnswer, isActive } = req.body;

    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, startTime: true, endTime: true },
    });

    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Build update data
    const updateData = {};
    
    if (theme !== undefined) updateData.theme = theme.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Handle time updates with validation
    if (startTime !== undefined || endTime !== undefined) {
      const newStartTime = startTime ? new Date(startTime) : existingSession.startTime;
      const newEndTime = endTime ? new Date(endTime) : existingSession.endTime;
      const now = new Date();

      if (newStartTime >= newEndTime) {
        return res.status(400).json({
          error: 'Invalid time range',
          message: 'End time must be after start time',
        });
      }

      if (startTime !== undefined) updateData.startTime = newStartTime;
      if (endTime !== undefined) updateData.endTime = newEndTime;
    }

    // Handle secret question/answer updates
    if (secretQuestion !== undefined) updateData.secretQuestion = secretQuestion.trim();
    if (secretAnswer !== undefined) {
      updateData.secretAnswer = await bcrypt.hash(secretAnswer.toLowerCase().trim(), 12);
    }

    // Update session
    const session = await prisma.session.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        secretQuestion: true,
        qrCodeData: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { attendance: true },
        },
      },
    });

    // Regenerate QR code if session is still active
    let qrData = null;
    if (session.isActive) {
      try {
        qrData = await qrCodeService.generateSessionQR(session.id);
        // Update QR code data if URL changed
        if (qrData.url !== session.qrCodeData) {
          await prisma.session.update({
            where: { id: session.id },
            data: { qrCodeData: qrData.url },
          });
          session.qrCodeData = qrData.url;
        }
      } catch (qrError) {
        console.error('QR code regeneration failed:', qrError);
      }
    }

    // Add status and QR code images
    const now = new Date();
    const sessionResponse = {
      ...session,
      status: getSessionStatus(session, now),
      attendanceCount: session._count.attendance,
      ...(qrData && {
        qrCode: qrData.dataUrl,
        qrCodeSvg: qrData.svg,
      }),
    };

    res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: { session: sessionResponse },
    });

  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update session',
    });
  }
};

/**
 * Delete a session
 */
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, theme: true, _count: { select: { attendance: true } } },
    });

    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Check if session has attendance records
    if (existingSession._count.attendance > 0) {
      // Soft delete by setting isActive to false
      await prisma.session.update({
        where: { id: parseInt(id) },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: 'Session deactivated (attendance records preserved)',
        data: {
          sessionId: parseInt(id),
          theme: existingSession.theme,
          attendanceCount: existingSession._count.attendance,
        },
      });
    } else {
      // Hard delete if no attendance records
      await prisma.session.delete({
        where: { id: parseInt(id) },
      });

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully',
        data: {
          sessionId: parseInt(id),
          theme: existingSession.theme,
        },
      });
    }

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete session',
    });
  }
};

/**
 * Download QR code for a session
 */
const downloadQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'png' } = req.query;

    // Check if session exists and is active
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, theme: true, isActive: true },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    if (!session.isActive) {
      return res.status(400).json({
        error: 'Session inactive',
        message: 'Cannot download QR code for inactive session',
      });
    }

    // Generate QR code buffer
    const qrBuffer = await qrCodeService.generateQRBuffer(session.id, format);
    
    // Set response headers
    const filename = `session-${session.id}-qr-code.${format}`;
    const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', qrBuffer.length);
    
    res.send(qrBuffer);

  } catch (error) {
    console.error('Download QR code error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to download QR code',
    });
  }
};

/**
 * Get printable QR code page
 */
const getPrintableQR = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(id) },
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
        message: 'Session with the specified ID does not exist',
      });
    }

    // Generate printable QR code
    const printableData = await qrCodeService.generatePrintableQR(session, true);

    // Return HTML for direct display/print
    res.setHeader('Content-Type', 'text/html');
    res.send(printableData.printableHtml);

  } catch (error) {
    console.error('Get printable QR error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate printable QR code',
    });
  }
};

/**
 * Get session statistics
 */
const getSessionStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await Promise.all([
      // Total sessions
      prisma.session.count(),
      // Active sessions (currently ongoing)
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      }),
      // Upcoming sessions
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { gt: now },
        },
      }),
      // Recent sessions (last 30 days)
      prisma.session.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      // Total attendance across all sessions
      prisma.attendance.count(),
      // Recent attendance (last 30 days)
      prisma.attendance.count({
        where: {
          checkedInAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    const [totalSessions, activeSessions, upcomingSessions, recentSessions, totalAttendance, recentAttendance] = stats;

    res.status(200).json({
      success: true,
      data: {
        sessions: {
          total: totalSessions,
          active: activeSessions,
          upcoming: upcomingSessions,
          recent: recentSessions,
        },
        attendance: {
          total: totalAttendance,
          recent: recentAttendance,
          averagePerSession: totalSessions > 0 ? Math.round(totalAttendance / totalSessions) : 0,
        },
        period: '30 days',
      },
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session statistics',
    });
  }
};

/**
 * Helper function to determine session status
 */
const getSessionStatus = (session, now) => {
  if (!session.isActive) return 'inactive';
  if (now < new Date(session.startTime)) return 'upcoming';
  if (now > new Date(session.endTime)) return 'completed';
  return 'active';
};

module.exports = {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  downloadQRCode,
  getPrintableQR,
  getSessionStats,
};