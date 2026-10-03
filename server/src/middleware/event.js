const prisma = require('../config/database');

const DEFAULT_EVENT_SLUG = 'homecoming';
const CACHE_TTL_MS = 30 * 1000;

let cache = { at: 0, events: [] };
let inFlight = null;

const loadEvents = async () => {
  if (Date.now() - cache.at < CACHE_TTL_MS && cache.events.length > 0) {
    return cache.events;
  }
  // Every API request resolves an event, so share one refresh between them.
  if (!inFlight) {
    inFlight = prisma.event
      .findMany({ orderBy: { createdAt: 'asc' } })
      .then((events) => {
        cache = { at: Date.now(), events };
        return events;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

const clearEventCache = () => {
  cache = { at: 0, events: [] };
};

const findEvent = async (idOrSlug) => {
  const events = await loadEvents();
  return events.find((e) => e.id === idOrSlug || e.slug === idOrSlug) || null;
};

const getDefaultEvent = async () => {
  const events = await loadEvents();
  return (
    events.find((e) => e.slug === DEFAULT_EVENT_SLUG) ||
    events.find((e) => e.isActive) ||
    events[0] ||
    null
  );
};

const getEventById = async (id) => {
  if (!id) return null;
  const event = await findEvent(id);
  if (event) return event;
  clearEventCache();
  return findEvent(id);
};

/**
 * Picks the event a request works on. Admin, reg-rep and pastoral users choose it
 * with the X-Event-Id header (or ?eventId=); requests without one, or with an id
 * that no longer exists, fall back to Homecoming so older clients keep working.
 * Member-based logins (chariot and chapel
 * leaders) are pinned to their own event later, in the auth middleware.
 */
const resolveEvent = async (req, res, next) => {
  try {
    const requested = req.headers['x-event-id'] || req.query.eventId;
    const event = (requested && (await getEventById(String(requested)))) || (await getDefaultEvent());

    req.event = event;
    next();
  } catch (error) {
    console.error('Resolve event error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve event',
    });
  }
};

const requireEvent = (req, res, next) => {
  if (!req.event) {
    return res.status(400).json({
      error: 'No event',
      message: 'Create an event first',
    });
  }
  next();
};

const requireChariotEvent = (req, res, next) => {
  if (!req.event || !req.event.hasChariots) {
    return res.status(404).json({
      error: 'Not available',
      message: 'Chariots are not used in this event',
    });
  }
  next();
};

const eventIdOf = (req) => req.event?.id;

module.exports = {
  resolveEvent,
  requireEvent,
  requireChariotEvent,
  getEventById,
  getDefaultEvent,
  clearEventCache,
  eventIdOf,
};
