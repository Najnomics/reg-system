const prisma = require('../config/database');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

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
            chapelRole: true,
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
            chapelRole: true,
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
 * Export all chapels as PDF
 */
const exportChapelsPDF = async (req, res) => {
  try {
    const chapels = await prisma.chapel.findMany({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            chapelRole: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    const filename = `chapels_report_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('Chapels Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Total Chapels: ${chapels.length}`);
    doc.moveDown();

    if (chapels.length === 0) {
      doc.fontSize(12).text('No chapels found.');
      doc.end();
      return;
    }

    chapels.forEach((chapel, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(14).text(`${index + 1}. ${chapel.name}`, { underline: true });
      doc.moveDown(0.2);

      const invitees = chapel.members.filter(member => member.chapelRole === 'INVITEE');
      const members = chapel.members.filter(member => member.chapelRole === 'MEMBER');
      const workers = chapel.members.filter(member => member.chapelRole === 'WORKER');
      const leaders = chapel.members.filter(member => member.chapelRole === 'CHAPEL_LEADER');

      doc.fontSize(11).text(`Invitees (${invitees.length}):`);
      if (invitees.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        invitees.forEach((member, i) => {
          doc.fontSize(10).text(`  ${i + 1}. ${member.name} (${member.email})`);
        });
      }
      doc.moveDown(0.2);

      doc.fontSize(11).text(`Members (${members.length}):`);
      if (members.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        members.forEach((member, i) => {
          doc.fontSize(10).text(`  ${i + 1}. ${member.name} (${member.email})`);
        });
      }

      doc.moveDown(0.2);

      doc.fontSize(11).text(`Workers (${workers.length}):`);
      if (workers.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        workers.forEach((member, i) => {
          doc.fontSize(10).text(`  ${i + 1}. ${member.name} (${member.email})`);
        });
      }

      doc.moveDown(0.2);

      doc.fontSize(11).text(`Chapel Leaders (${leaders.length}):`);
      if (leaders.length === 0) {
        doc.fontSize(10).text('  None');
      } else {
        leaders.forEach((member, i) => {
          doc.fontSize(10).text(`  ${i + 1}. ${member.name} (${member.email})`);
        });
      }

      doc.moveDown();
    });

    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.end();
  } catch (error) {
    console.error('Export chapels PDF error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to export chapels as PDF',
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
    const { memberIds, role = 'MEMBER' } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'memberIds must be a non-empty array',
      });
    }

    if (!['INVITEE', 'MEMBER', 'CHAPEL_LEADER'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'role must be INVITEE, MEMBER, or CHAPEL_LEADER',
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
      select: { id: true, name: true, chapelId: true, chapelRole: true },
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
        details: {
          conflicts: alreadyAssigned.map(member => ({
            id: member.id,
            name: member.name,
            chapelId: member.chapelId,
          })),
        },
      });
    }

    const roleSwitches = existingMembers.filter(
      member => member.chapelRole !== 'WORKER' && member.chapelId === id && member.chapelRole && member.chapelRole !== role
    ).length;

    const workerIds = existingMembers
      .filter(member => member.chapelRole === 'WORKER')
      .map(member => member.id);
    const nonWorkerIds = existingMembers
      .filter(member => member.chapelRole !== 'WORKER')
      .map(member => member.id);

    if (nonWorkerIds.length > 0) {
      await prisma.member.updateMany({
        where: { id: { in: nonWorkerIds } },
        data: { chapelId: id, chapelRole: role },
      });
    }

    if (workerIds.length > 0) {
      // If assigning CHAPEL_LEADER role, update the role even for workers
      // Otherwise, just update chapelId to keep worker role
      await prisma.member.updateMany({
        where: { id: { in: workerIds } },
        data: role === 'CHAPEL_LEADER' ? { chapelId: id, chapelRole: role } : { chapelId: id },
      });
    }

    res.status(200).json({
      success: true,
      message: `Assigned ${memberIds.length} ${
        role === 'INVITEE' ? 'invitee(s)' : role === 'CHAPEL_LEADER' ? 'leader(s)' : 'member(s)'
      } to chapel`,
      data: {
        roleSwitches,
      },
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

    const membersInChapel = await prisma.member.findMany({
      where: { id: { in: memberIds }, chapelId: id },
      select: { id: true, chapelRole: true },
    });

    const workerIds = membersInChapel.filter(member => member.chapelRole === 'WORKER').map(member => member.id);
    const nonWorkerIds = membersInChapel.filter(member => member.chapelRole !== 'WORKER').map(member => member.id);

    if (nonWorkerIds.length > 0) {
      await prisma.member.updateMany({
        where: { id: { in: nonWorkerIds } },
        data: { chapelId: null, chapelRole: null },
      });
    }

    if (workerIds.length > 0) {
      await prisma.member.updateMany({
        where: { id: { in: workerIds } },
        data: { chapelId: null },
      });
    }

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
  exportChapelsPDF,
  createChapel,
  updateChapel,
  deleteChapel,
  addMembers,
  removeMembers,
};
