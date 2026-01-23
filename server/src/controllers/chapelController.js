const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Get all chapels
 */
const getChapels = async (req, res) => {
  try {
    const chapels = await prisma.chapel.findMany({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: { chapels },
    });
  } catch (error) {
    console.error('Get chapels error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chapels',
    });
  }
};

/**
 * Get a single chapel by ID
 */
const getChapel = async (req, res) => {
  try {
    const { id } = req.params;

    const chapel = await prisma.chapel.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
        admins: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: { chapel },
    });
  } catch (error) {
    console.error('Get chapel error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chapel',
    });
  }
};

/**
 * Create a new chapel
 */
const createChapel = async (req, res) => {
  try {
    const { name, description } = req.body;

    const chapel = await prisma.chapel.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Chapel created successfully',
      data: { chapel },
    });
  } catch (error) {
    console.error('Create chapel error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create chapel',
    });
  }
};

/**
 * Update a chapel
 */
const updateChapel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingChapel = await prisma.chapel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingChapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    const chapel = await prisma.chapel.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Chapel updated successfully',
      data: { chapel },
    });
  } catch (error) {
    console.error('Update chapel error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update chapel',
    });
  }
};

/**
 * Delete a chapel
 */
const deleteChapel = async (req, res) => {
  try {
    const { id } = req.params;

    const chapel = await prisma.chapel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    await prisma.chapel.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Chapel deleted successfully',
    });
  } catch (error) {
    console.error('Delete chapel error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete chapel',
    });
  }
};

/**
 * Assign members to a chapel
 */
const addMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    const chapel = await prisma.chapel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    const existingMembers = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, chapelId: true },
    });

    if (existingMembers.length !== memberIds.length) {
      return res.status(404).json({
        error: 'Some members not found',
        message: 'One or more members do not exist',
      });
    }

    const alreadyAssigned = existingMembers.filter(member => member.chapelId && member.chapelId !== id);
    if (alreadyAssigned.length > 0) {
      return res.status(409).json({
        error: 'Member already assigned',
        message: 'One or more members are already assigned to another chapel',
      });
    }

    await prisma.member.updateMany({
      where: { id: { in: memberIds } },
      data: { chapelId: id },
    });

    res.status(200).json({
      success: true,
      message: `Assigned ${memberIds.length} member(s) to chapel`,
    });
  } catch (error) {
    console.error('Assign members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to assign members',
    });
  }
};

/**
 * Remove members from a chapel
 */
const removeMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    await prisma.member.updateMany({
      where: { id: { in: memberIds }, chapelId: id },
      data: { chapelId: null },
    });

    res.status(200).json({
      success: true,
      message: 'Members removed successfully',
    });
  } catch (error) {
    console.error('Remove members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove members',
    });
  }
};

module.exports = {
  getChapels,
  getChapel,
  createChapel,
  updateChapel,
  deleteChapel,
  addMembers,
  removeMembers,
};
