const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const qrCodeService = require('../services/qrCodeService');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');

/**
 * Get all sessions with pagination and filtering
 */
const getSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, fromDate, toDate, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Check if user is admin or reg-rep (to show secret question and answer)
    const canViewSecretInfo = req.user && (req.user.userType === 'admin' || req.user.userType === 'reg-rep');

    // Build filter conditions
    let where = {};

    if (status) {
      if (status === 'active') {
        const currentTime = new Date();
        where.AND = [
          { isActive: true },
          { startTime: { lte: currentTime } },
          { endTime: { gte: currentTime } },
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

    // Build select fields - include secret question and answer for admins and reg-reps
    const selectFields = {
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
    };

    if (canViewSecretInfo) {
      selectFields.secretQuestion = true;
      selectFields.secretAnswerPlain = true;
    }

    // Get sessions and total count in parallel
    // Only count if we're on the first page to improve performance
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy,
        select: selectFields,
      }),
      prisma.session.count({ where }),
    ]);

    // Add status to each session
    const currentTime = new Date();
    const sessionsWithStatus = sessions.map(session => ({
      ...session,
      status: getSessionStatus(session, currentTime),
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

    // Check if user is admin or reg-rep (to show secret question and answer)
    const canViewSecretInfo = req.user && (req.user.userType === 'admin' || req.user.userType === 'reg-rep');

    // Build select fields - include secret question and answer for admins and reg-reps
    const selectFields = {
      id: true,
      theme: true,
      startTime: true,
      endTime: true,
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
    };

    if (canViewSecretInfo) {
      selectFields.secretQuestion = true;
      selectFields.secretAnswerPlain = true;
    }

    const session = await prisma.session.findUnique({
      where: { id },
      select: selectFields,
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Add session status
    const currentTime = new Date();
    const sessionWithStatus = {
      ...session,
      status: getSessionStatus(session, currentTime),
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
    console.log('=== CREATE SESSION REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user ? { id: req.user.id, email: req.user.email, userType: req.user.userType } : 'MISSING');
    console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const { theme, startTime, endTime, secretQuestion, secretAnswer } = req.body;

    // Check authentication
    if (!req.user || !req.user.id) {
      console.error('Authentication error: req.user is missing');
      console.error('Request headers:', Object.keys(req.headers));
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    // Validate required fields
    if (!theme || !startTime || !endTime || !secretQuestion || !secretAnswer) {
      console.log('Missing required fields:', {
        theme: !!theme,
        startTime: !!startTime,
        endTime: !!endTime,
        secretQuestion: !!secretQuestion,
        secretAnswer: !!secretAnswer
      });
      return res.status(400).json({
        error: 'Invalid input data',
        message: 'All fields are required: theme, startTime, endTime, secretQuestion, secretAnswer',
      });
    }

    // Validate time window
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({
        error: 'Invalid time range',
        message: 'End time must be after start time',
      });
    }

    // Hash the secret answer
    const hashedAnswer = await bcrypt.hash(secretAnswer.toLowerCase().trim(), 12);
    const plainAnswer = secretAnswer.trim(); // Store plain text for admin reference

    // Generate UUID for session ID
    const { randomUUID } = require('crypto');
    const sessionId = randomUUID();

    // Create session without QR code first
    const session = await prisma.session.create({
      data: {
        id: sessionId,
        theme: theme.trim(),
        startTime: start,
        endTime: end,
        secretQuestion: secretQuestion.trim(),
        secretAnswer: hashedAnswer,
        secretAnswerPlain: plainAnswer, // Store plain text for admin reference
        isActive: true,
        createdBy: req.user.id,
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
    const currentTime = new Date();
    const sessionResponse = {
      ...updatedSession,
      status: getSessionStatus(updatedSession, currentTime),
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
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    
    // Return more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create session',
      ...(isDevelopment && {
        details: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      }),
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
      where: { id },
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
      updateData.secretAnswerPlain = secretAnswer.trim(); // Store plain text for admin reference
    }

    // Check if user is admin or reg-rep (to show secret question and answer)
    const canViewSecretInfo = req.user && (req.user.userType === 'admin' || req.user.userType === 'reg-rep');

    // Build select fields - include secret question and answer for admins and reg-reps
    const selectFields = {
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
    };

    if (canViewSecretInfo) {
      selectFields.secretQuestion = true;
      selectFields.secretAnswerPlain = true;
    }

    // Update session
    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      select: selectFields,
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
    const currentTime = new Date();
    const sessionResponse = {
      ...session,
      status: getSessionStatus(session, currentTime),
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
      where: { id },
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
        where: { id },
        data: { isActive: false },
      });

      res.status(200).json({
        success: true,
        message: 'Session deactivated (attendance records preserved)',
        data: {
          sessionId: id,
          theme: existingSession.theme,
          attendanceCount: existingSession._count.attendance,
        },
      });
    } else {
      // Hard delete if no attendance records
      await prisma.session.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully',
        data: {
          sessionId: id,
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
      where: { id },
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
    let mimeType;
    if (format === 'svg') {
      mimeType = 'image/svg+xml';
    } else if (format === 'pdf') {
      mimeType = 'application/pdf';
    } else {
      mimeType = 'image/png';
    }
    
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
      where: { id },
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
    const currentTime = new Date();
    const thirtyDaysAgo = new Date(currentTime.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await Promise.all([
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
      // Upcoming sessions
      prisma.session.count({
        where: {
          isActive: true,
          startTime: { gt: currentTime },
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
 * Get detailed attendance for a session
 */
const getSessionAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAbsent = 'false' } = req.query; // Make absent members optional

    // Get session details and attendance records in parallel
    const [session, attendanceRecords, totalMembersCount] = await Promise.all([
      prisma.session.findUnique({
        where: { id },
        select: {
          id: true,
          theme: true,
          startTime: true,
          endTime: true,
          isActive: true,
        },
      }),
      prisma.attendance.findMany({
        where: { sessionId: id },
        select: {
          id: true,
          checkedInAt: true,
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              pin: true,
            },
          },
        },
        orderBy: { checkedInAt: 'desc' },
      }),
      prisma.member.count({ where: { isActive: true } }),
    ]);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Get only the IDs of members who attended
    const attendedMemberIds = new Set(attendanceRecords.map(record => record.member.id));

    // Only fetch absent members if explicitly requested and reasonable number
    let allMembers = [];
    if (includeAbsent === 'true' && totalMembersCount <= 5000) {
      allMembers = await prisma.member.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          pin: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    // Create list of members who attended
    const attendedMembers = attendanceRecords.map(record => ({
      id: record.member.id,
      name: record.member.name,
      email: record.member.email,
      pin: record.member.pin,
      checkedInAt: record.checkedInAt,
      status: 'present',
    }));

    // Create list of members who didn't attend (only if requested and loaded)
    const absentMembers = allMembers.length > 0
      ? allMembers
          .filter(member => !attendedMemberIds.has(member.id))
          .map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            pin: member.pin,
            checkedInAt: null,
            status: 'absent',
          }))
      : []; // Empty if not requested or too many members

    // Add session status
    const currentTime = new Date();
    const sessionWithStatus = {
      ...session,
      status: getSessionStatus(session, currentTime),
    };

    res.status(200).json({
      success: true,
      data: {
        session: sessionWithStatus,
        attendance: {
          present: attendedMembers,
          absent: absentMembers,
          summary: {
            totalMembers: totalMembersCount,
            present: attendedMembers.length,
            absent: absentMembers.length > 0 ? absentMembers.length : totalMembersCount - attendedMembers.length,
            attendanceRate: totalMembersCount > 0 
              ? Math.round((attendedMembers.length / totalMembersCount) * 100) 
              : 0,
          },
        },
      },
    });

  } catch (error) {
    console.error('Get session attendance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve session attendance',
    });
  }
};

/**
 * Export session attendance as CSV
 */
const exportSessionAttendanceCSV = async (req, res) => {
  try {
    const { id } = req.params;

    // Get session and attendance data
    const session = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId: id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    // Get all members for absent list
    const allMembers = await prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
      },
      orderBy: { name: 'asc' },
    });

    // Create CSV data
    const attendedMemberIds = new Set(attendanceRecords.map(record => record.member.id));
    
    // Present members
    const presentData = attendanceRecords.map(record => ({
      name: record.member.name,
      email: record.member.email,
      pin: record.member.pin,
      status: 'Present',
      checkedInAt: new Date(record.checkedInAt).toLocaleString(),
    }));

    // Absent members
    const absentData = allMembers
      .filter(member => !attendedMemberIds.has(member.id))
      .map(member => ({
        name: member.name,
        email: member.email,
        pin: member.pin,
        status: 'Absent',
        checkedInAt: 'N/A',
      }));

    // Combine all data
    const csvData = [...presentData, ...absentData];

    // Define CSV fields
    const fields = [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'PIN', value: 'pin' },
      { label: 'Status', value: 'status' },
      { label: 'Check-in Time', value: 'checkedInAt' },
    ];

    // Generate CSV
    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);

    // Set response headers
    const filename = `${session.theme.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);

  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export attendance as CSV',
    });
  }
};

/**
 * Export session attendance as PDF
 */
const exportSessionAttendancePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get session and attendance data (same as CSV)
    const session = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session with the specified ID does not exist',
      });
    }

    // Get attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId: id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
          },
        },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    // Get all members for absent list
    const allMembers = await prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
      },
      orderBy: { name: 'asc' },
    });

    const attendedMemberIds = new Set(attendanceRecords.map(record => record.member.id));
    const absentMembers = allMembers.filter(member => !attendedMemberIds.has(member.id));

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${session.theme.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.pdf`;

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title and session info
    doc.fontSize(20).text('Session Attendance Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).text(`Session: ${session.theme}`, { align: 'left' });
    doc.text(`Start Time: ${new Date(session.startTime).toLocaleString()}`);
    doc.text(`End Time: ${new Date(session.endTime).toLocaleString()}`);
    doc.text(`Total Members: ${allMembers.length}`);
    doc.text(`Present: ${attendanceRecords.length}`);
    doc.text(`Absent: ${absentMembers.length}`);
    doc.text(`Attendance Rate: ${Math.round((attendanceRecords.length / allMembers.length) * 100)}%`);
    doc.moveDown();

    // Present members section
    doc.fontSize(16).text('Members Present:', { underline: true });
    doc.moveDown(0.5);
    
    if (attendanceRecords.length > 0) {
      doc.fontSize(10);
      attendanceRecords.forEach((record, index) => {
        const y = doc.y;
        if (y > 700) { // Add new page if needed
          doc.addPage();
          doc.fontSize(16).text('Members Present (continued):', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
        }
        
        doc.text(`${index + 1}. ${record.member.name}`);
        doc.text(`   Email: ${record.member.email}`, { indent: 20 });
        doc.text(`   PIN: ${record.member.pin}`, { indent: 20 });
        doc.text(`   Check-in Time: ${new Date(record.checkedInAt).toLocaleString()}`, { indent: 20 });
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(12).text('No members present.');
    }

    doc.moveDown();

    // Absent members section
    doc.fontSize(16).text('Members Absent:', { underline: true });
    doc.moveDown(0.5);
    
    if (absentMembers.length > 0) {
      doc.fontSize(10);
      absentMembers.forEach((member, index) => {
        const y = doc.y;
        if (y > 700) { // Add new page if needed
          doc.addPage();
          doc.fontSize(16).text('Members Absent (continued):', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
        }
        
        doc.text(`${index + 1}. ${member.name}`);
        doc.text(`   Email: ${member.email}`, { indent: 20 });
        doc.text(`   PIN: ${member.pin}`, { indent: 20 });
        doc.moveDown(0.3);
      });
    } else {
      doc.fontSize(12).text('All members present!');
    }

    // Add generation timestamp
    doc.moveDown();
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export attendance as PDF',
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
  getSessionAttendance,
  exportSessionAttendanceCSV,
  exportSessionAttendancePDF,
  createSession,
  updateSession,
  deleteSession,
  downloadQRCode,
  getPrintableQR,
  getSessionStats,
};