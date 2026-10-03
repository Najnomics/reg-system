const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const { generateUniquePin, hashPin } = require('../utils/pinGenerator');

const MASTER_EVENT_SLUG = 'homecoming';

const key = (value) => String(value || '').trim().toLowerCase();

const getMasterEvent = () => prisma.event.findUnique({ where: { slug: MASTER_EVENT_SLUG } });

/**
 * Chapels and chapel leaders are the same for every event. Homecoming holds the
 * master list; this copies it into another event. It only adds or re-links, so
 * it is safe to run repeatedly and never removes anything from the target.
 *
 * Leaders keep their Homecoming PIN in the new event whenever that PIN is free.
 */
const syncConstantChapels = async (targetEventId, createdBy) => {
  const master = await getMasterEvent();
  const result = { chapelsCreated: 0, leadersCreated: 0, leadersUpdated: 0, source: master?.name || null };
  if (!master || master.id === targetEventId) return result;

  const [masterChapels, targetChapels] = await Promise.all([
    prisma.chapel.findMany({
      where: { eventId: master.id, isActive: true },
      select: { id: true, name: true, description: true },
    }),
    prisma.chapel.findMany({ where: { eventId: targetEventId }, select: { id: true, name: true } }),
  ]);

  const targetChapelByName = new Map(targetChapels.map((c) => [key(c.name), c.id]));
  const chapelIdMap = new Map();
  for (const chapel of masterChapels) {
    let targetId = targetChapelByName.get(key(chapel.name));
    if (!targetId) {
      // eslint-disable-next-line no-await-in-loop
      const created = await prisma.chapel.create({
        data: { name: chapel.name, description: chapel.description, eventId: targetEventId, createdBy },
        select: { id: true },
      });
      targetId = created.id;
      targetChapelByName.set(key(chapel.name), targetId);
      result.chapelsCreated += 1;
    }
    chapelIdMap.set(chapel.id, targetId);
  }

  const [leaders, targetMembers] = await Promise.all([
    prisma.member.findMany({
      where: {
        eventId: master.id,
        isActive: true,
        chapelRole: 'CHAPEL_LEADER',
        chapelId: { in: [...chapelIdMap.keys()] },
      },
      select: {
        name: true, firstName: true, lastName: true, email: true, phone: true,
        pin: true, pinHash: true, chapelId: true,
      },
    }),
    prisma.member.findMany({
      where: { eventId: targetEventId },
      select: { id: true, name: true, email: true, pin: true, chapelId: true, chapelRole: true },
    }),
  ]);

  const targetByName = new Map(targetMembers.map((m) => [key(m.name), m]));
  const targetByEmail = new Map(targetMembers.map((m) => [key(m.email), m]));
  const usedPins = new Set(targetMembers.map((m) => m.pin));

  for (const leader of leaders) {
    const chapelId = chapelIdMap.get(leader.chapelId);
    const existing = targetByName.get(key(leader.name)) || targetByEmail.get(key(leader.email));

    if (existing) {
      if (existing.chapelId !== chapelId || existing.chapelRole !== 'CHAPEL_LEADER') {
        // eslint-disable-next-line no-await-in-loop
        await prisma.member.update({
          where: { id: existing.id },
          data: { chapelId, chapelRole: 'CHAPEL_LEADER', isActive: true },
        });
        result.leadersUpdated += 1;
      }
      continue;
    }

    let { pin, pinHash } = leader;
    if (!pin || usedPins.has(pin)) {
      // eslint-disable-next-line no-await-in-loop
      pin = await generateUniquePin(targetEventId);
      pinHash = null;
    }
    // eslint-disable-next-line no-await-in-loop
    if (!pinHash) pinHash = await hashPin(pin);

    // eslint-disable-next-line no-await-in-loop
    const created = await prisma.member.create({
      data: {
        id: randomUUID(),
        name: leader.name,
        firstName: leader.firstName,
        lastName: leader.lastName,
        email: leader.email,
        phone: leader.phone,
        pin,
        pinHash,
        eventId: targetEventId,
        chapelId,
        chapelRole: 'CHAPEL_LEADER',
        createdBy,
      },
      select: { id: true, name: true, email: true, pin: true, chapelId: true, chapelRole: true },
    });
    usedPins.add(pin);
    targetByName.set(key(created.name), created);
    targetByEmail.set(key(created.email), created);
    result.leadersCreated += 1;
  }

  return result;
};

module.exports = { syncConstantChapels, getMasterEvent, MASTER_EVENT_SLUG };
