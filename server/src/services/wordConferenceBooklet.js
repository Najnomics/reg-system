const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const emailService = require('./emailService');

const BOOKLET_PATH = path.join(__dirname, '../../assets/WC-2026-Booklet.pdf');
const ALREADY_SENT_NAMES = path.join(__dirname, '../data/booklet-already-sent-names.txt');
const CONFERENCE_START = new Date('2026-10-30T00:00:00.000Z');
const POLL_MS = 20000;

let started = false;
let sending = false;

const usableEmail = (email) => {
  const value = String(email || '').trim();
  return Boolean(value) && !value.includes('@wordconference.local');
};

const claimSend = async (memberId, eventId) => {
  try {
    await prisma.bookletSend.create({
      data: { id: randomUUID(), memberId, eventId },
    });
    return true;
  } catch (error) {
    if (error.code === 'P2002') return false;
    throw error;
  }
};

const releaseClaim = async (memberId, eventId) => {
  try {
    await prisma.bookletSend.delete({
      where: { memberId_eventId: { memberId, eventId } },
    });
  } catch (_) {
    // already gone
  }
};

const sendToMember = async (member, eventId) => {
  if (!usableEmail(member.email)) {
    console.log(`Booklet skip ${member.name}: no usable email`);
    return false;
  }
  const claimed = await claimSend(member.id, eventId);
  if (!claimed) return false;
  let lastError = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await emailService.sendWordConferenceBooklet(member, BOOKLET_PATH);
      console.log(`Booklet sent ${member.name}`);
      return true;
    } catch (error) {
      lastError = error.message || 'send failed';
      await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
    }
  }
  await releaseClaim(member.id, eventId);
  console.error(`Booklet failed ${member.name}:`, lastError);
  return false;
};

const queueAfterCheckin = (member, eventId) => {
  setImmediate(async () => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, slug: true },
      });
      if (!event || event.slug !== 'word-conference') return;
      await sendToMember(member, event.id);
    } catch (error) {
      console.error('Booklet check-in queue failed:', error.message);
    }
  });
};

const seedAlreadySent = async (event) => {
  if (!fs.existsSync(ALREADY_SENT_NAMES)) return 0;
  const names = fs.readFileSync(ALREADY_SENT_NAMES, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const members = await prisma.member.findMany({
    where: { eventId: event.id, name: { in: names } },
    select: { id: true, name: true },
  });
  const byName = new Map();
  for (const member of members) {
    if (!byName.has(member.name)) byName.set(member.name, member);
  }
  let seeded = 0;
  for (const name of names) {
    const member = byName.get(name);
    if (!member) continue;
    const claimed = await claimSend(member.id, event.id);
    if (claimed) seeded += 1;
  }
  return seeded;
};

const pendingCheckedIn = async (event) => {
  return prisma.member.findMany({
    where: {
      eventId: event.id,
      isActive: { not: false },
      bookletSends: { none: { eventId: event.id } },
      attendance: {
        some: {
          session: {
            eventId: event.id,
            startTime: { gte: CONFERENCE_START },
          },
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
};

const backfill = async () => {
  if (sending) return;
  sending = true;
  try {
    if (!fs.existsSync(BOOKLET_PATH)) {
      console.error('Booklet PDF missing on server');
      return;
    }
    const event = await prisma.event.findFirst({ where: { slug: 'word-conference' } });
    if (!event) return;
    const waiting = await pendingCheckedIn(event);
    if (!waiting.length) return;
    console.log(`Booklet backfill: ${waiting.length} checked-in people still need the letter`);
    for (const member of waiting) {
      await sendToMember(member, event.id);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  } catch (error) {
    console.error('Booklet backfill failed:', error.message);
  } finally {
    sending = false;
  }
};

const start = async () => {
  if (started) return;
  started = true;
  try {
    const event = await prisma.event.findFirst({ where: { slug: 'word-conference' } });
    if (!event) {
      console.warn('Booklet watcher: Word Conference event not found');
      return;
    }
    const seeded = await seedAlreadySent(event);
    console.log(`Booklet watcher running. Recorded ${seeded} people already sent.`);
    await backfill();
    setInterval(() => {
      backfill().catch((error) => console.error('Booklet poll failed:', error.message));
    }, POLL_MS);
  } catch (error) {
    console.error('Booklet watcher failed to start:', error.message);
  }
};

module.exports = {
  queueAfterCheckin,
  start,
  backfill,
};
