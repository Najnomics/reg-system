const prisma = require('../config/database');
const { clearEventCache } = require('../middleware/event');
const { syncConstantChapels } = require('../services/constantChapels');

const MEMBER_BASED_USERS = ['chariot-leader', 'chariot-assistant', 'chapel-leader'];

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'event';

const uniqueSlug = async (base, excludeId) => {
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.event.findFirst({ where: { slug, ...(excludeId && { NOT: { id: excludeId } }) } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
};

const withCounts = {
  _count: {
    select: { members: true, sessions: true, chapels: true, chariots: true },
  },
};

const getEvents = async (req, res) => {
  try {
    let where = {};
    if (req.user?.userType === 'chapel-leader') {
      where = {
        isActive: true,
        members: {
          some: {
            email: { equals: req.user.email, mode: 'insensitive' },
            isActive: true,
            chapelRole: 'CHAPEL_LEADER',
            chapelId: { not: null },
          },
        },
      };
    } else if (MEMBER_BASED_USERS.includes(req.user?.userType)) {
      where = { id: req.event?.id };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      include: withCounts,
    });

    res.status(200).json({ success: true, data: { events } });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch events' });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: withCounts,
    });
    if (!event) {
      return res.status(404).json({ error: 'Event not found', message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: { event } });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to fetch event' });
  }
};

const createEvent = async (req, res) => {
  try {
    const { name, description, venue, startDate, endDate, hasChariots } = req.body;
    const slug = await uniqueSlug(slugify(req.body.slug || name));

    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        venue: venue || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        hasChariots: Boolean(hasChariots),
      },
      include: withCounts,
    });

    clearEventCache();

    let constants = null;
    try {
      constants = await syncConstantChapels(event.id, req.user.id);
    } catch (syncError) {
      console.error('Copy chapels into new event error:', syncError);
    }

    const created = await prisma.event.findUnique({ where: { id: event.id }, include: withCounts });
    res.status(201).json({
      success: true,
      message: constants
        ? `Event created with ${constants.chapelsCreated} chapel(s) and ${constants.leadersCreated} chapel leader(s)`
        : 'Event created, but chapels could not be copied. Use "Sync chapels & leaders" to retry.',
      data: { event: created, constants },
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to create event' });
  }
};

const syncEventChapels = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found', message: 'Event not found' });
    }
    const result = await syncConstantChapels(event.id, req.user.id);
    res.status(200).json({
      success: true,
      message: `Added ${result.chapelsCreated} chapel(s) and ${result.leadersCreated} chapel leader(s); re-linked ${result.leadersUpdated}`,
      data: result,
    });
  } catch (error) {
    console.error('Sync event chapels error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to sync chapels' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Event not found', message: 'Event not found' });
    }

    const { name, description, venue, startDate, endDate, hasChariots, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description || null;
    if (venue !== undefined) data.venue = venue || null;
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (hasChariots !== undefined) data.hasChariots = Boolean(hasChariots);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
      include: withCounts,
    });

    clearEventCache();
    res.status(200).json({ success: true, message: 'Event updated successfully', data: { event } });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error', message: 'Failed to update event' });
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  syncEventChapels,
};
