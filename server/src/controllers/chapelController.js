const prisma = require('../config/database');
const crypto = require('crypto');

/**
 * Get all chapels
 */
const getChapels = async (req, res) => {
  try {
    const chapels = await prisma.chapel.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workers: {
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
            workers: true,
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
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subLeader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workers: {
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
            workers: true,
            members: true,
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
    const { name, description, leaderId, subLeaderId } = req.body;

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

    if (subLeaderId && subLeaderId === leaderId) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'Leader and subleader must be different members',
      });
    }

    if (subLeaderId) {
      const subLeader = await prisma.member.findUnique({
        where: { id: subLeaderId },
        select: { id: true },
      });
      if (!subLeader) {
        return res.status(404).json({
          error: 'Subleader not found',
          message: 'The specified subleader does not exist',
        });
      }
    }

    const existingLeader = await prisma.chapel.findFirst({
      where: { leaderId, isActive: true },
    });
    if (existingLeader) {
      return res.status(409).json({
        error: 'Leader already assigned',
        message: 'This member is already a leader of another active chapel',
      });
    }

    const existingSubLeader = await prisma.chapel.findFirst({
      where: { subLeaderId: leaderId, isActive: true },
    });
    if (existingSubLeader) {
      return res.status(409).json({
        error: 'Leader already assigned',
        message: 'This member is already a subleader of another active chapel',
      });
    }

    const existingWorkerForLeader = await prisma.chapelWorker.findFirst({
      where: {
        memberId: leaderId,
        chapel: {
          isActive: true,
        },
      },
      include: {
        chapel: {
          select: { name: true },
        },
      },
    });
    if (existingWorkerForLeader) {
      return res.status(409).json({
        error: 'Leader already assigned',
        message: `This member is already a worker of "${existingWorkerForLeader.chapel.name}" chapel`,
      });
    }

    if (subLeaderId) {
      const [subLeaderAsLeader, subLeaderAsSubLeader, subLeaderAsWorker] = await Promise.all([
        prisma.chapel.findFirst({
          where: { leaderId: subLeaderId, isActive: true },
          select: { name: true },
        }),
        prisma.chapel.findFirst({
          where: { subLeaderId, isActive: true },
          select: { name: true },
        }),
        prisma.chapelWorker.findFirst({
          where: {
            memberId: subLeaderId,
            chapel: { isActive: true },
          },
          include: { chapel: { select: { name: true } } },
        }),
      ]);

      if (subLeaderAsLeader) {
        return res.status(409).json({
          error: 'Subleader already assigned',
          message: `This member is already a leader of "${subLeaderAsLeader.name}" chapel`,
        });
      }
      if (subLeaderAsSubLeader) {
        return res.status(409).json({
          error: 'Subleader already assigned',
          message: `This member is already a subleader of "${subLeaderAsSubLeader.name}" chapel`,
        });
      }
      if (subLeaderAsWorker) {
        return res.status(409).json({
          error: 'Subleader already assigned',
          message: `This member is already a worker of "${subLeaderAsWorker.chapel.name}" chapel`,
        });
      }
    }

    const chapel = await prisma.chapel.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        leaderId,
        subLeaderId: subLeaderId || null,
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
        subLeader: {
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
    const { name, description, leaderId, subLeaderId } = req.body;

    const existingChapel = await prisma.chapel.findUnique({
      where: { id },
      select: { id: true, leaderId: true, subLeaderId: true },
    });

    if (!existingChapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    const resolvedSubLeaderId = subLeaderId === '' ? null : subLeaderId;
    const targetLeaderId = leaderId || existingChapel.leaderId;
    const targetSubLeaderId = resolvedSubLeaderId !== undefined ? resolvedSubLeaderId : existingChapel.subLeaderId;

    if (targetSubLeaderId && targetLeaderId === targetSubLeaderId) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'Leader and subleader must be different members',
      });
    }

    if (leaderId && leaderId !== existingChapel.leaderId) {
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

      const [otherLeader, otherSubLeader, otherWorker] = await Promise.all([
        prisma.chapel.findFirst({
          where: { leaderId, isActive: true, id: { not: id } },
          select: { name: true },
        }),
        prisma.chapel.findFirst({
          where: { subLeaderId: leaderId, isActive: true, id: { not: id } },
          select: { name: true },
        }),
        prisma.chapelWorker.findFirst({
          where: {
            memberId: leaderId,
            chapel: { isActive: true, id: { not: id } },
          },
          include: { chapel: { select: { name: true } } },
        }),
      ]);

      if (otherLeader) {
        return res.status(409).json({
          error: 'Leader already assigned',
          message: `This member is already a leader of "${otherLeader.name}" chapel`,
        });
      }
      if (otherSubLeader) {
        return res.status(409).json({
          error: 'Leader already assigned',
          message: `This member is already a subleader of "${otherSubLeader.name}" chapel`,
        });
      }
      if (otherWorker) {
        return res.status(409).json({
          error: 'Leader already assigned',
          message: `This member is already a worker of "${otherWorker.chapel.name}" chapel`,
        });
      }
    }

    if (resolvedSubLeaderId !== undefined && resolvedSubLeaderId !== existingChapel.subLeaderId) {
      if (resolvedSubLeaderId) {
        const subLeader = await prisma.member.findUnique({
          where: { id: resolvedSubLeaderId },
          select: { id: true },
        });
        if (!subLeader) {
          return res.status(404).json({
            error: 'Subleader not found',
            message: 'The specified subleader does not exist',
          });
        }

        const [otherLeader, otherSubLeader, otherWorker] = await Promise.all([
          prisma.chapel.findFirst({
            where: { leaderId: resolvedSubLeaderId, isActive: true, id: { not: id } },
            select: { name: true },
          }),
          prisma.chapel.findFirst({
            where: { subLeaderId: resolvedSubLeaderId, isActive: true, id: { not: id } },
            select: { name: true },
          }),
          prisma.chapelWorker.findFirst({
            where: {
              memberId: resolvedSubLeaderId,
              chapel: { isActive: true, id: { not: id } },
            },
            include: { chapel: { select: { name: true } } },
          }),
        ]);

        if (otherLeader) {
          return res.status(409).json({
            error: 'Subleader already assigned',
            message: `This member is already a leader of "${otherLeader.name}" chapel`,
          });
        }
        if (otherSubLeader) {
          return res.status(409).json({
            error: 'Subleader already assigned',
            message: `This member is already a subleader of "${otherSubLeader.name}" chapel`,
          });
        }
        if (otherWorker) {
          return res.status(409).json({
            error: 'Subleader already assigned',
            message: `This member is already a worker of "${otherWorker.chapel.name}" chapel`,
          });
        }
      }
    }

    const chapel = await prisma.chapel.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(leaderId && { leaderId }),
        ...(resolvedSubLeaderId !== undefined && { subLeaderId: resolvedSubLeaderId }),
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subLeader: {
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
 * Add workers to a chapel
 */
const addWorkers = async (req, res) => {
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
      select: { id: true, leaderId: true, subLeaderId: true },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

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

    if (memberIds.includes(chapel.leaderId) || (chapel.subLeaderId && memberIds.includes(chapel.subLeaderId))) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'Leader or subleader cannot be assigned as a worker',
      });
    }

    const existingLeaders = await prisma.chapel.findMany({
      where: {
        leaderId: { in: memberIds },
        isActive: true,
        id: { not: id },
      },
      select: { leaderId: true, name: true },
    });

    if (existingLeaders.length > 0) {
      const leaderNames = existingLeaders.map(c => c.name).join(', ');
      return res.status(409).json({
        error: 'Invalid assignment',
        message: `One or more members are already leaders of other chapels: ${leaderNames}`,
      });
    }

    const existingSubLeaders = await prisma.chapel.findMany({
      where: {
        subLeaderId: { in: memberIds },
        isActive: true,
        id: { not: id },
      },
      select: { subLeaderId: true, name: true },
    });

    if (existingSubLeaders.length > 0) {
      const subLeaderNames = existingSubLeaders.map(c => c.name).join(', ');
      return res.status(409).json({
        error: 'Invalid assignment',
        message: `One or more members are already subleaders of other chapels: ${subLeaderNames}`,
      });
    }

    const existingWorkers = await prisma.chapelWorker.findMany({
      where: {
        memberId: { in: memberIds },
        chapel: {
          isActive: true,
          id: { not: id },
        },
      },
      include: {
        chapel: { select: { name: true } },
        member: { select: { name: true } },
      },
    });

    if (existingWorkers.length > 0) {
      const workerInfo = existingWorkers.map(w =>
        `${w.member.name} (${w.chapel.name})`
      ).join(', ');
      return res.status(409).json({
        error: 'Invalid assignment',
        message: `One or more members are already workers of other chapels: ${workerInfo}`,
      });
    }

    const results = [];
    for (const memberId of memberIds) {
      try {
        const worker = await prisma.chapelWorker.create({
          data: {
            id: crypto.randomUUID(),
            chapelId: id,
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
        results.push(worker);
      } catch (error) {
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Added ${results.length} worker(s) to chapel`,
      data: { workers: results },
    });
  } catch (error) {
    console.error('Add workers error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add workers',
    });
  }
};

/**
 * Remove workers from a chapel
 */
const removeWorkers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    await prisma.chapelWorker.deleteMany({
      where: {
        chapelId: id,
        memberId: { in: memberIds },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Workers removed successfully',
    });
  } catch (error) {
    console.error('Remove workers error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove workers',
    });
  }
};

/**
 * Add members to a chapel
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
      select: { id: true, leaderId: true, subLeaderId: true },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

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

    if (memberIds.includes(chapel.leaderId) || (chapel.subLeaderId && memberIds.includes(chapel.subLeaderId))) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'Leader or subleader cannot be assigned as a member',
      });
    }

    const results = [];
    for (const memberId of memberIds) {
      try {
        const chapelMember = await prisma.chapelMember.create({
          data: {
            id: crypto.randomUUID(),
            chapelId: id,
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
        results.push(chapelMember);
      } catch (error) {
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Added ${results.length} member(s) to chapel`,
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

    await prisma.chapelMember.deleteMany({
      where: {
        chapelId: id,
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
  getChapels,
  getChapel,
  createChapel,
  updateChapel,
  deleteChapel,
  addWorkers,
  removeWorkers,
  addMembers,
  removeMembers,
};
