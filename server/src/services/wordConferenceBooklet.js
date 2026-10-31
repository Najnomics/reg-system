const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const emailService = require('./emailService');

const BOOKLET_PATH = path.join(__dirname, '../../assets/WC-2026-Booklet.pdf');
const ALREADY_SENT_NAMES = path.join(__dirname, '../data/booklet-already-sent-names.txt');
const CONFERENCE_START = new Date('2026-10-30T00:00:00.000Z');
const POLL_MS = 15000;
const SEND_TIMEOUT_MS = 60000;
const ATTEMPTS_PER_TURN = 2;
const REQUEUE_MS = 15000;
const MAX_TURNS = 8;

let started = false;
let working = false;
const queue = [];
const queuedIds = new Set();
const turns = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, label) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

const usableEmail = (email) => {
  const value = String(email || '').trim();
  return Boolean(value) && !value.includes('@wordconference.local');
};

const alreadyConfirmed = async (memberId, eventId) => {
  const row = await prisma.bookletSend.findUnique({
    where: { memberId_eventId: { memberId, eventId } },
    select: { id: true },
  });
  return Boolean(row);
};

const recordConfirmedSend = async (memberId, eventId) => {
  await prisma.bookletSend.upsert({
    where: { memberId_eventId: { memberId, eventId } },
    create: { id: randomUUID(), memberId, eventId, sentAt: new Date() },
    update: { sentAt: new Date() },
  });
};

const sendToMember = async (member, eventId, { force = false } = {}) => {
  if (!usableEmail(member.email)) {
    console.log(`Booklet skip ${member.name}: no usable email`);
    return 'skipped';
  }
  if (!force && await alreadyConfirmed(member.id, eventId)) return 'already';
  let lastError = '';
  for (let attempt = 1; attempt <= ATTEMPTS_PER_TURN; attempt += 1) {
    try {
      await withTimeout(
        emailService.sendWordConferenceBooklet(member, BOOKLET_PATH),
        SEND_TIMEOUT_MS,
        `Booklet send ${member.name}`,
      );
      await recordConfirmedSend(member.id, eventId);
      console.log(`Booklet sent ${member.name}`);
      return 'sent';
    } catch (error) {
      lastError = error.message || 'send failed';
      console.error(`Booklet attempt ${attempt} failed ${member.name}:`, lastError);
      if (attempt < ATTEMPTS_PER_TURN) await wait(3000);
    }
  }
  return lastError;
};

const pump = async () => {
  if (working) return;
  working = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      queuedIds.delete(job.member.id);
      try {
        const result = await sendToMember(job.member, job.eventId, { force: job.force });
        if (result === 'sent' || result === 'already' || result === 'skipped') {
          turns.delete(job.member.id);
          continue;
        }
        const used = (turns.get(job.member.id) || 0) + 1;
        turns.set(job.member.id, used);
        if (used >= MAX_TURNS) {
          console.error(`Booklet gave up ${job.member.name} after ${used} turns`);
          continue;
        }
        console.log(`Booklet will retry ${job.member.name} in ${REQUEUE_MS / 1000}s (turn ${used}/${MAX_TURNS})`);
        setTimeout(() => enqueue(job.member, job.eventId, { force: job.force }), REQUEUE_MS);
      } catch (error) {
        console.error('Booklet job failed:', error.message);
        setTimeout(() => enqueue(job.member, job.eventId, { force: job.force }), REQUEUE_MS);
      }
    }
  } finally {
    working = false;
    if (queue.length) setImmediate(pump);
  }
};

const enqueue = (member, eventId, { force = false } = {}) => {
  if (!member?.id || queuedIds.has(member.id)) return;
  queuedIds.add(member.id);
  queue.push({ member, eventId, force });
  setImmediate(pump);
};

const queueAfterCheckin = (member, eventId) => {
  setImmediate(async () => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, slug: true },
      });
      if (!event || event.slug !== 'word-conference') return;
      enqueue(member, event.id);
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
  if (!names.length) return 0;
  const members = await prisma.member.findMany({
    where: { eventId: event.id, name: { in: names } },
    select: { id: true, name: true },
  });
  const byName = new Map();
  for (const member of members) {
    if (!byName.has(member.name)) byName.set(member.name, member);
  }
  const ids = [...byName.values()].map((member) => member.id);
  const existing = ids.length
    ? await prisma.bookletSend.findMany({
      where: { eventId: event.id, memberId: { in: ids } },
      select: { memberId: true },
    })
    : [];
  const have = new Set(existing.map((row) => row.memberId));
  const rows = [];
  for (const name of names) {
    const member = byName.get(name);
    if (!member || have.has(member.id)) continue;
    have.add(member.id);
    rows.push({ id: randomUUID(), memberId: member.id, eventId: event.id });
  }
  if (!rows.length) return 0;
  const created = await prisma.bookletSend.createMany({ data: rows, skipDuplicates: true });
  return created.count || rows.length;
};

const conferenceSessionWhere = (eventId) => ({
  eventId,
  OR: [
    { startTime: { gte: CONFERENCE_START } },
    { createdAt: { gte: CONFERENCE_START } },
  ],
});

const pendingCheckedIn = async (event) => {
  return prisma.member.findMany({
    where: {
      eventId: event.id,
      isActive: { not: false },
      bookletSends: { none: { eventId: event.id } },
      attendance: {
        some: {
          session: conferenceSessionWhere(event.id),
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
};

const backfill = async () => {
  try {
    if (!fs.existsSync(BOOKLET_PATH)) {
      console.error('Booklet PDF missing on server');
      return;
    }
    const event = await prisma.event.findFirst({ where: { slug: 'word-conference' } });
    if (!event) return;
    const waiting = await pendingCheckedIn(event);
    if (!waiting.length) return;
    console.log(`Booklet queue: ${waiting.length} checked-in people still need the letter`);
    for (const member of waiting) enqueue(member, event.id);
  } catch (error) {
    console.error('Booklet backfill failed:', error.message);
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
    setInterval(() => {
      backfill().catch((err) => console.error('Booklet poll failed:', err.message));
    }, POLL_MS);
  }
};

module.exports = {
  queueAfterCheckin,
  start,
  backfill,
  sendToMember,
};
