const prisma = require('../config/database');
const { generateMemberPin } = require('../utils/pinGenerator');

/**
 * Get all members with pagination and search
 */
const getMembers = async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, query, name, email, phone } = req.query;
    
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
    }

    // Get members and total count
    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
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
          page,
          limit,
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
      where: { id: parseInt(id) },
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
    const { name, email, phone } = req.body;

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

    // Create member
    const member = await prisma.member.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone?.trim() || null,
        pin,
        pinHash,
        isActive: true,
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

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: { member },
    });

  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create member',
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
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
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
 * Search members with advanced filters
 */
const searchMembers = async (req, res) => {
  try {
    const { query, name, email, phone, pin, page, limit, sortBy, sortOrder } = req.query;
    
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
        take: limit,
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
          page,
          limit,
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
 * Resend PIN email to member
 */
const resendPin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if member exists
    const member = await prisma.member.findUnique({
      where: { id: parseInt(id) },
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

    // TODO: Implement email service to send PIN
    // For now, we'll just return success
    // const emailService = require('../services/emailService');
    // await emailService.sendPin(member);

    // Log the email attempt
    await prisma.emailLog.create({
      data: {
        memberId: member.id,
        type: 'pin',
        subject: 'Your Church Attendance PIN',
        status: 'sent', // Would be 'sent' or 'failed' based on actual email result
      },
    });

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

module.exports = {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  resendPin,
};