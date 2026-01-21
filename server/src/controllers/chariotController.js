const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Get all chariots
 */
const getChariots = async (req, res) => {
  try {
    const chariots = await prisma.chariot.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        members: {
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
        },
        _count: {
          select: {
            assistants: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: { chariots },
    });
  } catch (error) {
    console.error('Get chariots error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chariots',
    });
  }
};

/**
 * Get a single chariot by ID
 */
const getChariot = async (req, res) => {
  try {
    const { id } = req.params;

    const chariot = await prisma.chariot.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        members: {
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
        },
        _count: {
          select: {
            assistants: true,
            members: true,
          },
        },
      },
    });

    if (!chariot) {
      return res.status(404).json({
        error: 'Chariot not found',
        message: 'Chariot with the specified ID does not exist',
      });
    }

    res.status(200).json({
      success: true,
      data: { chariot },
    });
  } catch (error) {
    console.error('Get chariot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve chariot',
    });
  }
};

/**
 * Create a new chariot
 */
const createChariot = async (req, res) => {
  try {
    const { name, description, leaderId } = req.body;

    // Validate leader exists
    const leader = await prisma.member.findUnique({
      where: { id: leaderId },
      select: { id: true, name: true, email: true },
    });

    if (!leader) {
      return res.status(404).json({
        error: 'Leader not found',
        message: 'The specified leader does not exist',
      });
    }

    // Check if leader is already a leader of another chariot
    const existingChariot = await prisma.chariot.findFirst({
      where: { leaderId, isActive: true },
    });

    if (existingChariot) {
      return res.status(409).json({
        error: 'Leader already assigned',
        message: 'This member is already a leader of another active chariot',
      });
    }

    // Check if leader is already an assistant of another chariot
    const existingAssistant = await prisma.chariotAssistant.findFirst({
      where: {
        memberId: leaderId,
        chariot: {
          isActive: true,
        },
      },
      include: {
        chariot: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingAssistant) {
      return res.status(409).json({
        error: 'Member already assigned',
        message: `This member is already an assistant of "${existingAssistant.chariot.name}" chariot`,
      });
    }

    const chariot = await prisma.chariot.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        leaderId,
        createdBy: req.user.id,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Chariot created successfully',
      data: { chariot },
    });
  } catch (error) {
    console.error('Create chariot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create chariot',
    });
  }
};

/**
 * Update a chariot
 */
const updateChariot = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId } = req.body;

    // Check if chariot exists
    const existingChariot = await prisma.chariot.findUnique({
      where: { id },
    });

    if (!existingChariot) {
      return res.status(404).json({
        error: 'Chariot not found',
        message: 'Chariot with the specified ID does not exist',
      });
    }

    // If leaderId is being updated, validate
    if (leaderId && leaderId !== existingChariot.leaderId) {
      const leader = await prisma.member.findUnique({
        where: { id: leaderId },
        select: { id: true },
      });

      if (!leader) {
        return res.status(404).json({
          error: 'Leader not found',
          message: 'The specified leader does not exist',
        });
      }

      // Check if new leader is already a leader of another chariot
      const otherChariot = await prisma.chariot.findFirst({
        where: { leaderId, isActive: true, id: { not: id } },
      });

      if (otherChariot) {
        return res.status(409).json({
          error: 'Leader already assigned',
          message: 'This member is already a leader of another active chariot',
        });
      }

      // Check if new leader is already an assistant of another chariot
      const existingAssistant = await prisma.chariotAssistant.findFirst({
        where: {
          memberId: leaderId,
          chariot: {
            isActive: true,
            id: { not: id }, // Exclude current chariot
          },
        },
        include: {
          chariot: {
            select: {
              name: true,
            },
          },
        },
      });

      if (existingAssistant) {
        return res.status(409).json({
          error: 'Member already assigned',
          message: `This member is already an assistant of "${existingAssistant.chariot.name}" chariot`,
        });
      }
    }

    const chariot = await prisma.chariot.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(leaderId && { leaderId }),
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Chariot updated successfully',
      data: { chariot },
    });
  } catch (error) {
    console.error('Update chariot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update chariot',
    });
  }
};

/**
 * Delete a chariot
 */
const deleteChariot = async (req, res) => {
  try {
    const { id } = req.params;

    const chariot = await prisma.chariot.findUnique({
      where: { id },
    });

    if (!chariot) {
      return res.status(404).json({
        error: 'Chariot not found',
        message: 'Chariot with the specified ID does not exist',
      });
    }

    await prisma.chariot.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Chariot deleted successfully',
    });
  } catch (error) {
    console.error('Delete chariot error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete chariot',
    });
  }
};

/**
 * Add assistants to a chariot
 */
const addAssistants = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    // Check if chariot exists
    const chariot = await prisma.chariot.findUnique({
      where: { id },
    });

    if (!chariot) {
      return res.status(404).json({
        error: 'Chariot not found',
        message: 'Chariot with the specified ID does not exist',
      });
    }

    // Validate all members exist
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });

    if (members.length !== memberIds.length) {
      return res.status(404).json({
        error: 'Some members not found',
        message: 'One or more members do not exist',
      });
    }

    // Check if any member is the leader
    if (memberIds.includes(chariot.leaderId)) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'The leader cannot be assigned as an assistant',
      });
    }

    // Check if any member is already a leader of another chariot
    const existingLeaders = await prisma.chariot.findMany({
      where: {
        leaderId: { in: memberIds },
        isActive: true,
        id: { not: id }, // Exclude current chariot
      },
      select: {
        leaderId: true,
        name: true,
      },
    });

    if (existingLeaders.length > 0) {
      const leaderNames = existingLeaders.map(c => c.name).join(', ');
      return res.status(409).json({
        error: 'Invalid assignment',
        message: `One or more members are already leaders of other chariots: ${leaderNames}`,
      });
    }

    // Check if any member is already an assistant of another chariot
    const existingAssistants = await prisma.chariotAssistant.findMany({
      where: {
        memberId: { in: memberIds },
        chariot: {
          isActive: true,
          id: { not: id }, // Exclude current chariot
        },
      },
      include: {
        chariot: {
          select: {
            name: true,
          },
        },
        member: {
          select: {
            name: true,
          },
        },
      },
    });

    if (existingAssistants.length > 0) {
      const assistantInfo = existingAssistants.map(a => 
        `${a.member.name} (${a.chariot.name})`
      ).join(', ');
      return res.status(409).json({
        error: 'Invalid assignment',
        message: `One or more members are already assistants of other chariots: ${assistantInfo}`,
      });
    }

    // Add assistants (skip duplicates)
    const results = [];
    for (const memberId of memberIds) {
      try {
        const assistant = await prisma.chariotAssistant.create({
          data: {
            id: crypto.randomUUID(),
            chariotId: id,
            memberId,
          },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
        results.push(assistant);
      } catch (error) {
        // Skip if already exists (unique constraint)
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Added ${results.length} assistant(s) to chariot`,
      data: { assistants: results },
    });
  } catch (error) {
    console.error('Add assistants error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add assistants',
    });
  }
};

/**
 * Remove assistants from a chariot
 */
const removeAssistants = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    await prisma.chariotAssistant.deleteMany({
      where: {
        chariotId: id,
        memberId: { in: memberIds },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Assistants removed successfully',
    });
  } catch (error) {
    console.error('Remove assistants error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove assistants',
    });
  }
};

/**
 * Add members to a chariot
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

    // Check if chariot exists
    const chariot = await prisma.chariot.findUnique({
      where: { id },
    });

    if (!chariot) {
      return res.status(404).json({
        error: 'Chariot not found',
        message: 'Chariot with the specified ID does not exist',
      });
    }

    // Validate all members exist
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });

    if (members.length !== memberIds.length) {
      return res.status(404).json({
        error: 'Some members not found',
        message: 'One or more members do not exist',
      });
    }

    // Check if any member is the leader
    if (memberIds.includes(chariot.leaderId)) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'The leader cannot be assigned as a member',
      });
    }

    // Add members (skip duplicates)
    const results = [];
    for (const memberId of memberIds) {
      try {
        const chariotMember = await prisma.chariotMember.create({
          data: {
            id: crypto.randomUUID(),
            chariotId: id,
            memberId,
          },
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
        });
        results.push(chariotMember);
      } catch (error) {
        // Skip if already exists (unique constraint)
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Added ${results.length} member(s) to chariot`,
      data: { members: results },
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add members',
    });
  }
};

/**
 * Remove members from a chariot
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

    await prisma.chariotMember.deleteMany({
      where: {
        chariotId: id,
        memberId: { in: memberIds },
      },
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
  getChariots,
  getChariot,
  createChariot,
  updateChariot,
  deleteChariot,
  addAssistants,
  removeAssistants,
  addMembers,
  removeMembers,
};
