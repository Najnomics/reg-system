const prisma = require('../config/database');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

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
            chapelRole: true,
            chapel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        name: 'asc',
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
            chapelRole: true,
            chapel: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
 * Export all chariots as PDF
 */
const exportChariotsPDF = async (req, res) => {
  try {
    const chariots = await prisma.chariot.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            chapelRole: true,
            chapel: {
              select: { id: true, name: true },
            },
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                chapelRole: true,
                chapel: {
                  select: { id: true, name: true },
                },
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
                chapelRole: true,
                chapel: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const totalAssistants = chariots.reduce((sum, chariot) => sum + (chariot.assistants?.length || 0), 0);
    const totalMembers = chariots.reduce((sum, chariot) => sum + (chariot.members?.length || 0), 0);

    const formatChapelRole = (role) => {
      if (role === 'INVITEE') return 'Invitee';
      if (role === 'WORKER') return 'Worker';
      if (role === 'CHAPEL_LEADER') return 'Chapel Leader';
      return 'Member';
    };

    const doc = new PDFDocument({ margin: 50 });
    const filename = `chariots_report_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('Chariots Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Chariots: ${chariots.length}`);
    doc.text(`Total Assistants: ${totalAssistants}`);
    doc.text(`Total Members: ${totalMembers}`);
    doc.moveDown();

    if (chariots.length === 0) {
      doc.fontSize(12).text('No chariots found.');
      doc.end();
      return;
    }

    chariots.forEach((chariot, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(14).text(`${index + 1}. ${chariot.name}`, { underline: true });
      if (chariot.description) {
        doc.fontSize(10).text(`Description: ${chariot.description}`);
      }
      doc.moveDown(0.3);

      const leaderLabel = chariot.leader
        ? `${chariot.leader.name} (${chariot.leader.email})${chariot.leader.chapelRole ? ` - ${formatChapelRole(chariot.leader.chapelRole)}` : ''}`
        : 'Not assigned';
      doc.fontSize(11).text(`Leader: ${leaderLabel}`);
      doc.moveDown(0.2);

      doc.fontSize(11).text(`Assistants (${chariot.assistants.length}):`);
      if (chariot.assistants.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        chariot.assistants.forEach((assistant, i) => {
          const roleLabel = assistant.member.chapelRole ? ` - ${formatChapelRole(assistant.member.chapelRole)}` : '';
          doc.fontSize(10).text(`  ${i + 1}. ${assistant.member.name} (${assistant.member.email})${roleLabel}`);
        });
      }
      doc.moveDown(0.2);

      doc.fontSize(11).text(`Members (${chariot.members.length}):`);
      if (chariot.members.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        chariot.members.forEach((member, i) => {
          const roleLabel = member.member.chapelRole ? ` - ${formatChapelRole(member.member.chapelRole)}` : '';
          doc.fontSize(10).text(`  ${i + 1}. ${member.member.name} (${member.member.email})${roleLabel}`);
        });
      }

      doc.moveDown();
    });

    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.end();
  } catch (error) {
    console.error('Export chariots PDF error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export chariots as PDF',
    });
  }
};

/**
 * Export all chariots as CSV
 */
const exportChariotsCSV = async (req, res) => {
  try {
    const chariots = await prisma.chariot.findMany({
      include: {
        leader: {
          select: {
            name: true,
            email: true,
            chapelRole: true,
            chapel: { select: { name: true } },
          },
        },
        assistants: {
          include: {
            member: {
              select: {
                name: true,
                email: true,
                chapelRole: true,
                chapel: { select: { name: true } },
              },
            },
          },
        },
        members: {
          include: {
            member: {
              select: {
                name: true,
                email: true,
                chapelRole: true,
                chapel: { select: { name: true } },
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
      return '';
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
      ['Chariot', 'Role', 'Name', 'Email', 'Chapel', 'Chapel Role'],
    ];

    chariots.forEach((chariot) => {
      const leader = chariot.leader;
      rows.push([
        chariot.name,
        'Leader',
        leader?.name || 'Not assigned',
        leader?.email || '',
        leader?.chapel?.name || '',
        formatChapelRole(leader?.chapelRole),
      ]);

      if (chariot.assistants.length === 0) {
        rows.push([chariot.name, 'Assistant', 'None', '', '', '']);
      } else {
        chariot.assistants.forEach((assistant) => {
          const member = assistant.member;
          rows.push([
            chariot.name,
            'Assistant',
            member?.name || '',
            member?.email || '',
            member?.chapel?.name || '',
            formatChapelRole(member?.chapelRole),
          ]);
        });
      }

      if (chariot.members.length === 0) {
        rows.push([chariot.name, 'Member', 'None', '', '', '']);
      } else {
        chariot.members.forEach((memberEntry) => {
          const member = memberEntry.member;
          rows.push([
            chariot.name,
            'Member',
            member?.name || '',
            member?.email || '',
            member?.chapel?.name || '',
            formatChapelRole(member?.chapelRole),
          ]);
        });
      }
    });

    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const filename = `chariots_report_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export chariots CSV error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export chariots as CSV',
    });
  }
};

/**
 * Assign all unassigned members to chariots (workers, invitees, others)
 */
const assignUnassignedMembersToChariots = async (req, res) => {
  try {
    const chariots = await prisma.chariot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        leaderId: true,
        assistants: { select: { memberId: true } },
        members: { select: { memberId: true } },
      },
      orderBy: { name: 'asc' },
    });

    if (chariots.length === 0) {
      return res.status(400).json({
        error: 'No active chariots',
        message: 'No active chariots found to assign members',
      });
    }

    const occupied = new Set();
    chariots.forEach((chariot) => {
      if (chariot.leaderId) occupied.add(chariot.leaderId);
      chariot.assistants.forEach((assistant) => occupied.add(assistant.memberId));
    });

    const existingAssignments = await prisma.chariotMember.findMany({
      select: { memberId: true },
    });
    const alreadyAssigned = new Set(existingAssignments.map((entry) => entry.memberId));

    const excludedIds = new Set([...occupied, ...alreadyAssigned]);

    const chariotStats = chariots.map((chariot) => ({
      id: chariot.id,
      name: chariot.name,
      count: chariot.members.length,
    }));

    const assignMembers = (memberIds) => {
      const assignments = [];
      memberIds.forEach((memberId) => {
        let targetIndex = 0;
        for (let i = 1; i < chariotStats.length; i += 1) {
          const current = chariotStats[i];
          const target = chariotStats[targetIndex];
          if (current.count < target.count) {
            targetIndex = i;
          } else if (current.count === target.count && current.name < target.name) {
            targetIndex = i;
          }
        }
        const target = chariotStats[targetIndex];
        assignments.push({ memberId, chariotId: target.id });
        target.count += 1;
      });
      return assignments;
    };

    const [workers, invitees, others] = await Promise.all([
      prisma.member.findMany({
        where: {
          isActive: { not: false },
          chapelRole: 'WORKER',
          id: { notIn: Array.from(excludedIds) },
        },
        select: { id: true },
      }),
      prisma.member.findMany({
        where: {
          isActive: { not: false },
          chapelRole: 'INVITEE',
          id: { notIn: Array.from(excludedIds) },
        },
        select: { id: true },
      }),
      prisma.member.findMany({
        where: {
          isActive: { not: false },
          id: { notIn: Array.from(excludedIds) },
          OR: [
            { chapelRole: { notIn: ['WORKER', 'INVITEE'] } },
            { chapelRole: null },
          ],
        },
        select: { id: true },
      }),
    ]);

    const workerIds = workers.map((member) => member.id);
    workerIds.forEach((id) => excludedIds.add(id));
    const inviteeIds = invitees.map((member) => member.id).filter((id) => !excludedIds.has(id));
    inviteeIds.forEach((id) => excludedIds.add(id));
    const otherIds = others
      .map((member) => member.id)
      .filter((id) => !excludedIds.has(id));

    const workerAssignments = assignMembers(workerIds);
    const inviteeAssignments = assignMembers(inviteeIds);
    const otherAssignments = assignMembers(otherIds);

    const assignments = [
      ...workerAssignments,
      ...inviteeAssignments,
      ...otherAssignments,
    ];

    if (assignments.length > 0) {
      await prisma.chariotMember.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unassigned members distributed to chariots',
      data: {
        totalChariots: chariots.length,
        assigned: assignments.length,
        workersAssigned: workerAssignments.length,
        inviteesAssigned: inviteeAssignments.length,
        othersAssigned: otherAssignments.length,
      },
    });
  } catch (error) {
    console.error('Assign unassigned members error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to assign unassigned members to chariots',
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
            chapelRole: true,
            chapel: {
              select: {
                id: true,
                name: true,
              },
            },
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
            chapelRole: true,
            chapel: {
              select: {
                id: true,
                name: true,
              },
            },
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
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
                chapelRole: true,
                chapel: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
  exportChariotsPDF,
  exportChariotsCSV,
  assignUnassignedMembersToChariots,
  createChariot,
  updateChariot,
  deleteChariot,
  addAssistants,
  removeAssistants,
  addMembers,
  removeMembers,
};
