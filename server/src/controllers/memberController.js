const prisma = require('../config/database');
const { generateMemberPin } = require('../utils/pinGenerator');

/**
 * Get all members with pagination and search
 */
const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', query, name, email, phone } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build search conditions
    let where = {
      isActive: true, // Only show active members by default
    };
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    } else {
      // Individual field filters
      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }
      if (phone) {
        where.phone = { contains: phone, mode: 'insensitive' };
      }
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
          phone: true,
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
        phone: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
    
    const { name, email, phone } = req.body;

    // Check authentication
    if (!req.user || !req.user.id) {
      console.error('Authentication error: req.user is missing');
      console.error('Request headers:', Object.keys(req.headers));
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    // Check if email already exists
    const existingMember = await prisma.member.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (existingMember) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A member with this email address already exists',
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
        email: email.toLowerCase(),
        phone: phone?.trim() || null,
        pin,
        pinHash,
        isActive: true,
        createdBy: req.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send PIN email to new member
    try {
      const emailService = require('../services/emailService');
      await emailService.sendPin(member);
    } catch (emailError) {
      console.error('Failed to send PIN email to new member:', emailError);
      // Continue with success response even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Member created successfully and PIN email sent',
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
    const { name, email, phone, isActive } = req.body;

    // Check if member exists
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    // Check if email is being changed and if it conflicts
    if (email && email.toLowerCase() !== existingMember.email) {
      const emailConflict = await prisma.member.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });

      if (emailConflict) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'A member with this email address already exists',
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update member
    const member = await prisma.member.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        pin: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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
 * Delete/deactivate a member
 */
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const existingMember = await prisma.member.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!existingMember) {
      return res.status(404).json({
        error: 'Member not found',
        message: 'Member with the specified ID does not exist',
      });
    }

    // Soft delete by setting isActive to false
    const member = await prisma.member.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Member deactivated successfully',
      data: { member },
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to deactivate member',
    });
  }
};

/**
 * Bulk delete/deactivate members
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
        isActive: true,
      },
    });

    if (existingMembers.length === 0) {
      return res.status(404).json({
        error: 'No members found',
        message: 'None of the specified members exist',
      });
    }

    // Soft delete by setting isActive to false
    const result = await prisma.member.updateMany({
      where: {
        id: { in: memberIds },
      },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      message: `Successfully deactivated ${result.count} member(s)`,
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
    const { query, name, email, phone, pin, page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build search conditions
    let where = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    } else {
      // Individual field filters
      if (name) {
        where.name = { contains: name, mode: 'insensitive' };
      }
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }
      if (phone) {
        where.phone = { contains: phone, mode: 'insensitive' };
      }
      if (pin) {
        where.pin = pin;
      }
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
          phone: true,
          pin: true,
          isActive: true,
          createdAt: true,
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
        phone: true,
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

    // Send PIN email
    let emailSent = false;
    let emailError = null;
    
    try {
      const emailService = require('../services/emailService');
      const emailResult = await emailService.sendPin(member);
      emailSent = emailResult?.success !== false;
    } catch (err) {
      console.error('Failed to send PIN email:', err);
      emailError = err.message || 'Email service error';
    }

    if (!emailSent) {
      return res.status(500).json({
        error: 'Email sending failed',
        message: emailError || 'Failed to send PIN email. Please check email configuration.',
        data: { 
          memberEmail: member.email,
          memberName: member.name,
        },
      });
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
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resend PIN',
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
};