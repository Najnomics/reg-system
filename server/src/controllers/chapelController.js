const prisma = require('../config/database');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

/**
 * Get all chapels
 */
const getChapels = async (req, res) => {
  try {
    const chapels = await prisma.chapel.findMany({
      where: { eventId: req.event.id },
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

    const chapel = await prisma.chapel.findFirst({
      where: { id, eventId: req.event.id },
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
      where: { eventId: req.event.id },
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
        eventId: req.event.id,
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

    const existingChapel = await prisma.chapel.findFirst({
      where: { id, eventId: req.event.id },
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

    const chapel = await prisma.chapel.findFirst({
      where: { id, eventId: req.event.id },
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

    if (!['INVITEE', 'MEMBER', 'WORKER', 'CHAPEL_LEADER'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'role must be INVITEE, MEMBER, WORKER, or CHAPEL_LEADER',
      });
    }

    const eventId = req.event.id;

    const chapel = await prisma.chapel.findFirst({
      where: { id, eventId },
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
      select: { id: true, name: true, chapelId: true, chapelRole: true, eventId: true },
    });

    if (existingMembers.length !== memberIds.length) {
      return res.status(404).json({
        error: 'Some members not found',
        message: 'One or more members do not exist',
      });
    }

    if (existingMembers.some(member => member.eventId !== eventId)) {
      return res.status(400).json({
        error: 'Invalid assignment',
        message: 'All members must belong to the current event',
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
        role === 'INVITEE'
          ? 'invitee(s)'
          : role === 'CHAPEL_LEADER'
            ? 'leader(s)'
            : role === 'WORKER'
              ? 'worker(s)'
              : 'member(s)'
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

    const eventId = req.event.id;

    const chapel = await prisma.chapel.findFirst({
      where: { id, eventId },
      select: { id: true },
    });

    if (!chapel) {
      return res.status(404).json({
        error: 'Chapel not found',
        message: 'Chapel with the specified ID does not exist',
      });
    }

    const membersInChapel = await prisma.member.findMany({
      where: { id: { in: memberIds }, chapelId: id, eventId },
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

/**
 * Upload chapels from a CSV/Excel file
 */
const uploadChapels = async (req, res) => {
  try {
    const eventId = req.event.id;
    const filename = (req.file.originalname || '').toLowerCase();

    let rows;
    try {
      const workbook = filename.endsWith('.csv')
        ? XLSX.read(req.file.buffer.toString('utf8'), { type: 'string' })
        : XLSX.read(req.file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid file',
        message: 'Failed to read the uploaded file',
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid file',
        message: 'The file appears to be empty',
      });
    }

    const normalizeHeader = (value) => String(value ?? '').toLowerCase().replace(/[\s_-]/g, '');
    const headers = rows[0].map(normalizeHeader);
    const nameIndex = headers.findIndex(header => ['name', 'chapel', 'chapelname'].includes(header));
    const descriptionIndex = headers.findIndex(header => header === 'description');

    if (nameIndex === -1) {
      return res.status(400).json({
        error: 'Invalid file',
        message: 'Required column "Name" not found in the file',
      });
    }

    const existingChapels = await prisma.chapel.findMany({
      where: { eventId },
      select: { name: true },
    });
    const seenNames = new Set(existingChapels.map(chapel => chapel.name.trim().toLowerCase()));
    const fileNames = new Set();

    const cell = (row, index) => (index === -1 || row[index] === undefined || row[index] === null ? '' : String(row[index]).trim());

    const errors = [];
    const chapels = [];
    let total = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNumber = i + 1;
      if (!Array.isArray(row) || row.every(value => String(value ?? '').trim() === '')) continue;
      total += 1;

      const name = cell(row, nameIndex);
      const description = cell(row, descriptionIndex);

      if (!name) {
        failed += 1;
        errors.push({ row: rowNumber, message: 'Chapel name is required' });
        continue;
      }

      if (name.length > 100) {
        failed += 1;
        errors.push({ row: rowNumber, message: 'Chapel name must not exceed 100 characters' });
        continue;
      }

      if (description.length > 500) {
        failed += 1;
        errors.push({ row: rowNumber, message: 'Description must not exceed 500 characters' });
        continue;
      }

      const key = name.toLowerCase();
      if (fileNames.has(key)) {
        skipped += 1;
        errors.push({ row: rowNumber, message: `Skipped: "${name}" appears more than once in the file` });
        continue;
      }
      fileNames.add(key);

      if (seenNames.has(key)) {
        skipped += 1;
        errors.push({ row: rowNumber, message: `Skipped: chapel "${name}" already exists` });
        continue;
      }

      try {
        const chapel = await prisma.chapel.create({
          data: {
            id: crypto.randomUUID(),
            name,
            description: description || null,
            eventId,
            createdBy: req.user.id,
          },
        });
        seenNames.add(key);
        chapels.push(chapel);
      } catch (createError) {
        console.error('Upload chapel row error:', createError);
        failed += 1;
        errors.push({ row: rowNumber, message: `Failed to create chapel "${name}"` });
      }
    }

    res.status(200).json({
      success: true,
      message: `Created ${chapels.length} chapel(s)${skipped ? `, skipped ${skipped}` : ''}${failed ? `, ${failed} failed` : ''}`,
      data: {
        total,
        created: chapels.length,
        skipped,
        failed,
        errors,
        chapels,
      },
    });
  } catch (error) {
    console.error('Upload chapels error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to upload chapels',
    });
  }
};

/**
 * Download chapel upload template (CSV)
 */
const downloadChapelTemplate = async (req, res) => {
  try {
    const csv = ['Name,Description', 'Grace Chapel,Main sanctuary chapel'].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chapels_template.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Download chapel template error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to download chapel template',
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
  uploadChapels,
  downloadChapelTemplate,
};
