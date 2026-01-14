const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

/**
 * Get all reg-reps (admin only)
 */
const getRegReps = async (req, res) => {
  try {
    const { page = 1, limit = 20, query, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    // Build search conditions
    let where = {};
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Get reg-reps and total count
    const [regReps, total] = await Promise.all([
      prisma.regRep.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
        },
      }),
      prisma.regRep.count({ where }),
    ]);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    res.status(200).json({
      success: true,
      data: {
        regReps,
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
    console.error('Get reg-reps error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve reg-reps',
    });
  }
};

/**
 * Get a single reg-rep by ID (admin only)
 */
const getRegRep = async (req, res) => {
  try {
    const { id } = req.params;

    const regRep = await prisma.regRep.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    if (!regRep) {
      return res.status(404).json({
        error: 'Reg-rep not found',
        message: 'Reg-rep with the specified ID does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: { regRep },
    });

  } catch (error) {
    console.error('Get reg-rep error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve reg-rep',
    });
  }
};

/**
 * Create a new reg-rep (admin only)
 */
const createRegRep = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const adminId = req.user.id; // Admin creating this reg-rep

    // Check if email already exists in admin or regRep tables
    const [existingAdmin, existingRegRep] = await Promise.all([
      prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      }),
      prisma.regRep.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      }),
    ]);

    if (existingAdmin || existingRegRep) {
      return res.status(409).json({
        error: 'Email already exists',
        message: 'A user with this email address already exists',
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create reg-rep
    const regRep = await prisma.regRep.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        isActive: true,
        createdBy: adminId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Reg-rep created successfully',
      data: { regRep },
    });

  } catch (error) {
    console.error('Create reg-rep error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create reg-rep',
    });
  }
};

/**
 * Update a reg-rep (admin only)
 */
const updateRegRep = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    // Check if reg-rep exists
    const existingRegRep = await prisma.regRep.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, email: true },
    });

    if (!existingRegRep) {
      return res.status(404).json({
        error: 'Reg-rep not found',
        message: 'Reg-rep with the specified ID does not exist',
      });
    }

    // Check if email is being changed and if it conflicts
    if (email && email.toLowerCase() !== existingRegRep.email) {
      const [emailConflictAdmin, emailConflictRegRep] = await Promise.all([
        prisma.admin.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true },
        }),
        prisma.regRep.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true },
        }),
      ]);

      if (emailConflictAdmin || emailConflictRegRep) {
        return res.status(409).json({
          error: 'Email already exists',
          message: 'A user with this email address already exists',
        });
      }
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update reg-rep
    const regRep = await prisma.regRep.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Reg-rep updated successfully',
      data: { regRep },
    });

  } catch (error) {
    console.error('Update reg-rep error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update reg-rep',
    });
  }
};

/**
 * Delete/deactivate a reg-rep (admin only)
 */
const deleteRegRep = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reg-rep exists
    const existingRegRep = await prisma.regRep.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, isActive: true, name: true },
    });

    if (!existingRegRep) {
      return res.status(404).json({
        error: 'Reg-rep not found',
        message: 'Reg-rep with the specified ID does not exist',
      });
    }

    // Soft delete by setting isActive to false
    const regRep = await prisma.regRep.update({
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
      message: 'Reg-rep deactivated successfully',
      data: { regRep },
    });

  } catch (error) {
    console.error('Delete reg-rep error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to deactivate reg-rep',
    });
  }
};

/**
 * Toggle reg-rep status (admin only)
 */
const toggleRegRepStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if reg-rep exists
    const existingRegRep = await prisma.regRep.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, isActive: true, name: true },
    });

    if (!existingRegRep) {
      return res.status(404).json({
        error: 'Reg-rep not found',
        message: 'Reg-rep with the specified ID does not exist',
      });
    }

    // Toggle status
    const regRep = await prisma.regRep.update({
      where: { id: parseInt(id) },
      data: { isActive: !existingRegRep.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    const action = regRep.isActive ? 'activated' : 'deactivated';

    res.status(200).json({
      success: true,
      message: `Reg-rep ${action} successfully`,
      data: { regRep },
    });

  } catch (error) {
    console.error('Toggle reg-rep status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to toggle reg-rep status',
    });
  }
};

/**
 * Reset reg-rep password (admin only)
 */
const resetRegRepPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Check if reg-rep exists
    const existingRegRep = await prisma.regRep.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, email: true },
    });

    if (!existingRegRep) {
      return res.status(404).json({
        error: 'Reg-rep not found',
        message: 'Reg-rep with the specified ID does not exist',
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.regRep.update({
      where: { id: parseInt(id) },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: 'Reg-rep password reset successfully',
      data: { 
        regRepEmail: existingRegRep.email,
        regRepName: existingRegRep.name,
      },
    });

  } catch (error) {
    console.error('Reset reg-rep password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to reset reg-rep password',
    });
  }
};

module.exports = {
  getRegReps,
  getRegRep,
  createRegRep,
  updateRegRep,
  deleteRegRep,
  toggleRegRepStatus,
  resetRegRepPassword,
};