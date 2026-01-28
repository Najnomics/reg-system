const prisma = require('../config/database');
const { generateMemberPin } = require('../utils/pinGenerator');

/**
 * Get all members with pagination and search
 */
const getMembers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      query,
      name,
      email,
      chapelRole,
      chapelId,
      chariotId,
    } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build search conditions
    // Match frontend filter: isActive !== false (includes true and null)
    let where = {
      isActive: {
        not: false,
      },
    };
    
    // Build search query conditions
    const searchConditions = [];
    if (query) {
      searchConditions.push(
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      );
    } else {
      // Individual field filters
      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }
    }

    if (chapelRole === 'UNASSIGNED') {
      where.chapelId = null;
    } else if (chapelRole === 'INVITEE' || chapelRole === 'MEMBER' || chapelRole === 'WORKER' || chapelRole === 'CHAPEL_LEADER') {
      where.chapelRole = chapelRole;
    }

    if (chapelId) {
      if (chapelId === 'UNASSIGNED') {
        where.chapelId = null;
      } else {
        where.chapelId = chapelId;
      }
    }

    // Build chariot filter conditions
    const chariotConditions = [];
    if (chariotId) {
      if (chariotId === 'UNASSIGNED') {
        // Members not assigned to any chariot (not leader, assistant, or member)
        where.AND = [
          ...(where.AND || []),
          {
            chariotLeader: {
              none: {},
            },
          },
          {
            chariotAssistants: {
              none: {},
            },
          },
          {
            chariotMembers: {
              none: {},
            },
          },
        ];
      } else {
        // Members assigned to a specific chariot (as leader, assistant, or member)
        chariotConditions.push(
          { chariotLeader: { some: { id: chariotId } } },
          { chariotAssistants: { some: { chariotId: chariotId } } },
          { chariotMembers: { some: { chariotId: chariotId } } }
        );
      }
    }

    // Combine search and chariot conditions properly
    if (searchConditions.length > 0 && chariotConditions.length > 0) {
      // Both search and chariot filter: need to combine with AND
      // (member matches search query) AND (member is in specified chariot)
      where.AND = [
        ...(where.AND || []),
        {
          OR: searchConditions,
        },
        {
          OR: chariotConditions,
        },
      ];
    } else if (searchConditions.length > 0) {
      // Only search query
      where.OR = searchConditions;
    } else if (chariotConditions.length > 0) {
      // Only chariot filter
      where.OR = chariotConditions;
    }

    // Get members and total count in parallel
    // Only count if we're on the first page to improve performance
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
          chapelRole: true,
          chapel: {
            select: {
              id: true,
              name: true,
            },
          },
          chariotLeader: {
            select: { id: true, name: true },
          },
          chariotAssistants: {
            select: { chariot: { select: { id: true, name: true } } },
          },
          chariotMembers: {
            select: { chariot: { select: { id: true, name: true } } },
          },
          _count: {
            select: { attendance: true },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    // Calculate pagination info
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
    console.error('Get members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve members',
    });
  }
};

/**
 * Get a single member by ID
 */
const getMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        chapelRole: true,
        chapel: {
          select: {
            id: true,
            name: true,
          },
        },
        chariotLeader: {
          select: {
            id: true,
            name: true,
          },
        },
        chariotAssistants: {
          select: {
            chariot: {
              select: {
                id: true,
                name: true,
                leader: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        chariotMembers: {
          select: {
            chariot: {
              select: {
                id: true,
                name: true,
                leader: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        attendance: {
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
          take: 50, // Limit recent attendance records
        },
        _count: {
          select: { attendance: true },
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: { member },
    });

  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve member',
    });
  }
};

/**
 * Create a new member
 */
const createMember = async (req, res) => {
  try {
    console.log('=== CREATE MEMBER REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user ? { id: req.user.id, email: req.user.email, userType: req.user.userType } : 'MISSING');
    console.log('Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const { name, email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const blockedEmails = new Set([
      'nosakhareochuko@gmail.com',
      'dennisozobor@gmail.com',
    ]);

    // Check authentication
    if (!req.user || !req.user.id) {
      console.error('Authentication error: req.user is missing');
      console.error('Request headers:', Object.keys(req.headers));
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    if (blockedEmails.has(normalizedEmail)) {
      return res.status(409).json({
        error: 'Email blocked',
        message: 'A member with this email already exists and cannot be duplicated.',
      });
    }

    // Enforce unique full name (same name combination)
    const existingMember = await prisma.member.findUnique({
      where: { name: name.trim() },
      select: { id: true },
    });

    if (existingMember) {
      return res.status(409).json({
        error: 'Name already exists',
        message: 'A member with this name already exists. Please use a different name.',
      });
    }

    // Generate PIN and hash
    const { pin, pinHash } = await generateMemberPin();

    // Generate UUID for member ID
    const { randomUUID } = require('crypto');
    const memberId = randomUUID();

    // Create member
    const member = await prisma.member.create({
      data: {
        id: memberId,
        name: name.trim(),
        email: normalizedEmail,
        pin,
        pinHash,
        isActive: true,
        createdBy: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        chapelRole: true,
        chapel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // PIN email sending is disabled - admins will send PINs manually via the admin panel
    // Email can be sent manually using the "Resend PIN" feature

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Member created successfully.',
      data: { member },
    });

  } catch (error) {
    console.error('Create member error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    
    // Return more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create member',
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
 * Update a member
 */
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive, chapelRole, chapelId, pin, pinHash, id: bodyId, ...otherFields } = req.body;

    // SECURITY: Explicitly reject any attempt to update PIN or member ID
    if (pin !== undefined || pinHash !== undefined) {
      return res.status(400).json({
        error: 'Invalid update',
        message: 'PIN cannot be changed. PIN is permanent and cannot be modified.',
      });
    }

    if (bodyId !== undefined && bodyId !== id) {
      return res.status(400).json({
        error: 'Invalid update',
        message: 'Member ID cannot be changed.',
      });
    }

    // Reject any unexpected fields that could cause issues
    const allowedFields = ['name', 'email', 'isActive', 'chapelRole', 'chapelId'];
    const unexpectedFields = Object.keys(otherFields).filter(field => !allowedFields.includes(field));
    if (unexpectedFields.length > 0) {
      console.warn(`Unexpected fields in update request: ${unexpectedFields.join(', ')}`);
      // Don't fail, just log and ignore unexpected fields
    }

    // Check if member exists - MUST use the provided ID (prevents creating new member)
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, pin: true },
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    // Check if name is being changed and if it conflicts with ANOTHER member
    if (name && name.trim() !== existingMember.name) {
      const nameConflict = await prisma.member.findUnique({
        where: { name: name.trim() },
        select: { id: true },
      });

      // Only conflict if it's a different member (not the same member being updated)
      if (nameConflict && nameConflict.id !== id) {
        return res.status(409).json({
          error: 'Name already exists',
          message: 'A member with this name already exists. Please use a different name.',
        });
      }
    }

    // Build update data - ONLY include allowed fields
    // PIN is explicitly excluded - it cannot be changed
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (isActive !== undefined) updateData.isActive = isActive;

    if (chapelRole !== undefined) {
      const normalizedRole = String(chapelRole).trim().toUpperCase();
      const allowedRoles = ['INVITEE', 'MEMBER', 'WORKER', 'CHAPEL_LEADER', 'UNASSIGNED'];
      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: 'chapelRole must be invitee, member, worker, chapel leader, or unassigned',
        });
      }
      if (normalizedRole === 'UNASSIGNED') {
        updateData.chapelRole = null;
        updateData.chapelId = null;
      } else {
        updateData.chapelRole = normalizedRole;
      }
    }

    if (chapelId !== undefined) {
      if (chapelId === 'UNASSIGNED' || chapelId === null || chapelId === '') {
        updateData.chapelId = null;
        updateData.chapelRole = updateData.chapelRole ?? null;
      } else {
        updateData.chapelId = chapelId;
      }
    }

    // Update member - using WHERE clause ensures we update the EXISTING member by ID
    // This prevents creating a new member instance
    const member = await prisma.member.update({
      where: { id }, // CRITICAL: Using ID ensures we update existing member, not create new one
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        pin: true, // PIN is returned but never changed
        isActive: true,
        createdAt: true,
        updatedAt: true,
        chapelRole: true,
        chapel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Verify PIN was not changed (safety check)
    if (member.pin !== existingMember.pin) {
      console.error('CRITICAL: PIN was changed during update! This should never happen.');
      // Log error but don't fail the request - the damage is done
    }

    res.status(200).json({
      success: true,
      message: 'Member updated successfully',
      data: { member },
    });

  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update member',
    });
  }
};

/**
 * Delete a member (hard delete)
 */
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    const member = await prisma.member.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully',
      data: { member },
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete member',
    });
  }
};

/**
 * Bulk delete members (hard delete)
 */
const bulkDeleteMembers = async (req, res) => {
  try {
    const { memberIds } = req.body;

    // Validate input
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    // Validate all IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = memberIds.filter(id => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'All member IDs must be valid UUIDs',
        invalidIds,
      });
    }

    // Check if members exist
    const existingMembers = await prisma.member.findMany({
      where: {
        id: { in: memberIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (existingMembers.length === 0) {
      return res.status(404).json({
        error: 'No members found',
        message: 'None of the specified members exist',
      });
    }

    const result = await prisma.member.deleteMany({
      where: {
        id: { in: memberIds },
      },
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.count} member(s)`,
      data: {
        deletedCount: result.count,
        requestedCount: memberIds.length,
        foundCount: existingMembers.length,
      },
    });

  } catch (error) {
    console.error('Bulk delete members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to bulk delete members',
    });
  }
};

/**
 * Search members with advanced filters
 */
const searchMembers = async (req, res) => {
  try {
    const { query, name, email, pin, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', chapelRole } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build search conditions
    let where = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    } else {
      // Individual field filters
      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }
      if (pin) {
        where.pin = pin;
      }
    }

    if (chapelRole === 'UNASSIGNED') {
      where.chapelId = null;
    } else if (chapelRole === 'INVITEE' || chapelRole === 'MEMBER' || chapelRole === 'WORKER' || chapelRole === 'CHAPEL_LEADER') {
      where.chapelRole = chapelRole;
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
          chapelRole: true,
          chapel: {
            select: {
              id: true,
              name: true,
            },
          },
          chariotLeader: {
            select: { id: true, name: true },
          },
          chariotAssistants: {
            select: { chariot: { select: { id: true, name: true } } },
          },
          chariotMembers: {
            select: { chariot: { select: { id: true, name: true } } },
          },
          _count: {
            select: { attendance: true },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        members,
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
    console.error('Search members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to search members',
    });
  }
};

/**
 * Toggle member status (active/inactive)
 */
const toggleMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { id: true, isActive: true, name: true },
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    // Toggle status
    const member = await prisma.member.update({
      where: { id },
      data: { isActive: !existingMember.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const action = member.isActive ? 'activated' : 'deactivated';

    res.status(200).json({
      success: true,
      message: `Member ${action} successfully`,
      data: { member },
    });

  } catch (error) {
    console.error('Toggle member status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to toggle member status',
    });
  }
};

/**
 * Resend PIN email to member
 */
const resendPin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
      },
    });

    if (!member) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    if (!member.isActive) {
      return res.status(400).json({
        error: 'Member inactive',
        message: 'Cannot send PIN to inactive member',
      });
    }

    // Send PIN email with timeout
    let emailSent = false;
    let emailError = null;
    let emailDetails = null;
    
    try {
      const emailService = require('../services/emailService');
      console.log(`📧 Attempting to send PIN email to ${member.email}...`);
      
      // Add timeout wrapper to prevent hanging (increased to 45 seconds for Railway/Gmail)
      const emailPromise = emailService.sendPin(member);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout after 45 seconds. This may be due to Gmail blocking Railway IPs. Consider using SendGrid or another email service.')), 45000);
      });
      
      const emailResult = await Promise.race([emailPromise, timeoutPromise]);
      emailSent = emailResult?.success !== false;
      emailDetails = emailResult;
      console.log(`✅ PIN email sent successfully to ${member.email}`);
    } catch (err) {
      console.error('❌ Failed to send PIN email:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response,
        command: err.command,
        responseCode: err.responseCode,
        stack: err.stack,
      });
      emailError = err.message || 'Email service error';
      
      // Provide more helpful error message for Gmail
      if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail.com')) {
        if (err.code === 'EAUTH' || err.message?.includes('authentication') || err.message?.includes('password')) {
          emailError = 'Gmail authentication failed. Please ensure you are using an App Password (not your regular Gmail password). Enable 2-Step Verification and generate an App Password at https://myaccount.google.com/apppasswords';
        } else if (err.message?.includes('timeout')) {
          emailError = 'Gmail connection timeout. Please check your internet connection and ensure port 587 is not blocked.';
        }
      }
    }

    if (!emailSent) {
      // Return 500 but with detailed error message
      const errorResponse = {
        error: 'Email sending failed',
        message: emailError || 'Failed to send PIN email. Please check email configuration.',
        data: { 
          memberEmail: member.email,
          memberName: member.name,
        },
      };
      
      // Add email details in development mode
      if (process.env.NODE_ENV === 'development') {
        errorResponse.data.emailDetails = emailDetails;
      }
      
      console.error('❌ Email sending failed response:', errorResponse);
      return res.status(500).json(errorResponse);
    }

    res.status(200).json({
      success: true,
      message: `PIN email sent to ${member.email}`,
      data: { 
        memberEmail: member.email,
        memberName: member.name,
      },
    });

  } catch (error) {
    console.error('Resend PIN error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to resend PIN',
      ...(isDevelopment && {
        details: error.message,
        code: error.code,
        stack: error.stack,
      }),
    });
  }
};

/**
 * Bulk resend PIN emails to multiple members (admin only)
 */
const bulkResendPin = async (req, res) => {
  try {
    const { memberIds } = req.body;

    // Validate input
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    // Validate all IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = memberIds.filter(id => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'All member IDs must be valid UUIDs',
        invalidIds,
      });
    }

    // Get members
    const members = await prisma.member.findMany({
      where: {
        id: { in: memberIds },
        isActive: true, // Only send to active members
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
      },
    });

    if (members.length === 0) {
      return res.status(404).json({
        error: 'No active members found',
        message: 'None of the specified members exist or are active',
      });
    }

    // Send PIN emails
    const emailService = require('../services/emailService');
    const results = {
      successful: [],
      failed: [],
    };

    for (const member of members) {
      try {
        await emailService.sendPin(member);
        results.successful.push({
          id: member.id,
          email: member.email,
          name: member.name,
        });
      } catch (emailError) {
        console.error(`Failed to send PIN email to ${member.email}:`, emailError);
        results.failed.push({
          id: member.id,
          email: member.email,
          name: member.name,
          error: emailError.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `PIN emails sent to ${results.successful.length} member(s)`,
      data: {
        totalRequested: memberIds.length,
        totalFound: members.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
    });

  } catch (error) {
    console.error('Bulk resend PIN error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to bulk resend PINs',
    });
  }
};

/**
 * Resend PIN emails to all active members (admin only)
 */
const resendPinToAll = async (req, res) => {
  try {
    // Get all active members
    const members = await prisma.member.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
      },
    });

    if (members.length === 0) {
      return res.status(404).json({
        error: 'No active members found',
        message: 'There are no active members to send PINs to',
      });
    }

    // Send PIN emails
    const emailService = require('../services/emailService');
    const results = {
      successful: [],
      failed: [],
    };

    for (const member of members) {
      try {
        await emailService.sendPin(member);
        results.successful.push({
          id: member.id,
          email: member.email,
          name: member.name,
        });
      } catch (emailError) {
        console.error(`Failed to send PIN email to ${member.email}:`, emailError);
        results.failed.push({
          id: member.id,
          email: member.email,
          name: member.name,
          error: emailError.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `PIN emails sent to ${results.successful.length} out of ${members.length} member(s)`,
      data: {
        totalMembers: members.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results,
      },
    });

  } catch (error) {
    console.error('Resend PIN to all error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resend PINs to all members',
    });
  }
};

/**
 * Export all members as CSV
 */
const exportMembersCSV = async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        isActive: true,
        createdAt: true,
        chapelRole: true,
        chapel: { select: { name: true } },
        chariotLeader: {
          select: {
            name: true,
          },
        },
        chariotAssistants: {
          select: {
            chariot: {
              select: {
                name: true,
                leader: { select: { name: true, email: true } },
              },
            },
          },
        },
        chariotMembers: {
          select: {
            chariot: {
              select: {
                name: true,
                leader: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatChapelRole = (role) => {
      if (role === 'INVITEE') return 'Invitee';
      if (role === 'WORKER') return 'Worker';
      if (role === 'MEMBER') return 'Member';
      if (role === 'CHAPEL_LEADER') return 'Chapel Leader';
      return 'Not assigned';
    };

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [
      [
        'Name',
        'Email',
        'PIN',
        'Chapel',
        'Chapel Role',
        'Chariot',
        'Chariot Role',
        'Chariot Leader',
        'Chariot Leader Email',
        'Status',
        'Joined',
      ],
    ];

    members.forEach((member) => {
      let chariotName = '';
      let chariotRole = 'Not assigned';
      let leaderName = '';
      let leaderEmail = '';

      if (member.chariotLeader?.length) {
        chariotRole = 'Leader';
        chariotName = member.chariotLeader[0]?.name || '';
        leaderName = member.name || '';
        leaderEmail = member.email || '';
      } else if (member.chariotAssistants?.length) {
        chariotRole = 'Assistant';
        const chariot = member.chariotAssistants[0]?.chariot;
        chariotName = chariot?.name || '';
        leaderName = chariot?.leader?.name || '';
        leaderEmail = chariot?.leader?.email || '';
      } else if (member.chariotMembers?.length) {
        chariotRole = 'Member';
        const chariot = member.chariotMembers[0]?.chariot;
        chariotName = chariot?.name || '';
        leaderName = chariot?.leader?.name || '';
        leaderEmail = chariot?.leader?.email || '';
      }

      rows.push([
        member.name || '',
        member.email || '',
        member.pin || '',
        member.chapel?.name || '',
        formatChapelRole(member.chapelRole),
        chariotName,
        chariotRole,
        leaderName,
        leaderEmail,
        member.isActive === false ? 'Inactive' : 'Active',
        member.createdAt ? new Date(member.createdAt).toISOString() : '',
      ]);
    });

    const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="members.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export members CSV error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export members as CSV',
    });
  }
};

module.exports = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  toggleMemberStatus,
  searchMembers,
  resendPin,
  bulkResendPin,
  resendPinToAll,
  exportMembersCSV,
};