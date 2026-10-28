/**
 * Load the Word Conference guest list.
 * Duplicates are the same first and last name, in either order. Email is ignored.
 * A blank chapel is stored with no chapel, which the app shows as Unassigned.
 *
 *   node src/scripts/importWordConference.js            # report only
 *   node src/scripts/importWordConference.js --apply    # write Word Conference
 */
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const CSV = process.env.WC_CSV || '/Users/najnomics/Downloads/Guest list word-conference-2026 2026-10-28.csv';
const APPLY = process.argv.includes('--apply');

const ROLE_RANK = { leader: 5, 'sub-leader': 4, worker: 3, 'chapel member': 2, invitee: 1 };
const ROLE_MAP = {
  leader: 'CHAPEL_LEADER',
  'sub-leader': 'SUB_LEADER',
  worker: 'WORKER',
  'chapel member': 'MEMBER',
  invitee: 'INVITEE',
};
const CHAPEL_MAP = {
  fire: 'Fire',
  spirit: 'Spirit',
  faith: 'Faith',
  revelation: 'Revelations',
  revelations: 'Revelations',
  power: 'Power',
  gospel: 'Gospel',
  truth: 'Truth',
  'missions and glory': 'Missions and Glory',
  grace: 'Grace',
  light: 'Light',
  provost: 'Provost',
};

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const nameKey = (first, last) =>
  clean(`${first} ${last}`)
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow = () => { if (row.some((c) => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === '\t') pushCell();
    else if (ch === '\n') { pushCell(); pushRow(); }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { pushCell(); pushRow(); }
  const header = rows.shift().map((h) => h.trim());
  return rows.map((cols) => Object.fromEntries(header.map((h, i) => [h, cols[i] || ''])));
};

const chapelName = (raw) => {
  const text = clean(raw).toLowerCase().replace(/^chapel of (?:the )?/, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return CHAPEL_MAP[text] || null;
};

const loadRows = () => {
  const text = fs.readFileSync(CSV, 'utf16le').replace(/^\uFEFF/, '');
  const rows = parseCsv(text);
  const kept = new Map();
  let dropped = 0;
  let blankNames = 0;
  for (const row of rows) {
    const first = clean(row['First name']);
    const last = clean(row['Last name']);
    const key = nameKey(first, last);
    if (!key) { blankNames += 1; continue; }
    const category = clean(row['what category do you belong?']).toLowerCase();
    const stamp = Date.parse(row.Timestamp.replace(' ', 'T')) || 0;
    const candidate = { first, last, key, category, stamp, row };
    const current = kept.get(key);
    if (!current) { kept.set(key, candidate); continue; }
    dropped += 1;
    const better = stamp > current.stamp || (stamp === current.stamp && (ROLE_RANK[category] || 0) > (ROLE_RANK[current.category] || 0));
    if (better) kept.set(key, candidate);
  }
  return { rows: rows.length, people: [...kept.values()], dropped, blankNames };
};

const phoneOf = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits ? digits.slice(-10) : null;
};

(async () => {
  const { rows, people, dropped, blankNames } = loadRows();
  const unknownChapel = {};
  const byRole = {};
  const byChapel = {};
  let unassigned = 0;
  for (const person of people) {
    const role = ROLE_MAP[person.category];
    if (!role) throw new Error(`Unknown category: ${person.category}`);
    person.role = role;
    person.email = clean(person.row.Email).toLowerCase();
    person.phone = phoneOf(person.row['Phone Number']);
    person.displayName = clean(`${person.first} ${person.last}`);
    const rawChapel = clean(person.row['What chapel are you in/ from?']);
    const mapped = chapelName(rawChapel);
    if (!rawChapel) { person.chapel = null; unassigned += 1; }
    else if (!mapped) { person.chapel = null; unassigned += 1; unknownChapel[rawChapel] = (unknownChapel[rawChapel] || 0) + 1; }
    else person.chapel = mapped;
    byRole[role] = (byRole[role] || 0) + 1;
    byChapel[person.chapel || 'Unassigned'] = (byChapel[person.chapel || 'Unassigned'] || 0) + 1;
  }

  console.log(JSON.stringify({
    sourceRows: rows,
    duplicatesRemoved: dropped,
    blankNamesSkipped: blankNames,
    people: people.length,
    unassigned,
    byRole,
    byChapel,
    unknownChapel,
    apply: APPLY,
  }, null, 2));

  if (!APPLY) return;

  const direct = new URL(process.env.DIRECT_URL);
  direct.searchParams.set('connect_timeout', '30');
  direct.searchParams.set('connection_limit', '5');
  const prisma = new PrismaClient({ datasources: { db: { url: direct.toString() } } });
  const event = await prisma.event.findFirst({ where: { slug: 'word-conference' } });
  if (!event) throw new Error('Word Conference event not found');
  const [chapels, existing, admin] = await Promise.all([
    prisma.chapel.findMany({ where: { eventId: event.id }, select: { id: true, name: true } }),
    prisma.member.findMany({
      where: { eventId: event.id },
      select: { id: true, name: true, firstName: true, lastName: true, pin: true },
    }),
    prisma.admin.findFirst({ select: { id: true } }),
  ]);
  const chapelId = new Map(chapels.map((c) => [c.name.toLowerCase(), c.id]));
  for (const person of people) {
    if (person.chapel && !chapelId.has(person.chapel.toLowerCase())) {
      throw new Error(`Chapel missing in Word Conference: ${person.chapel}`);
    }
  }
  const existingByKey = new Map();
  for (const member of existing) {
    existingByKey.set(nameKey(member.firstName || '', member.lastName || '') || nameKey(member.name, ''), member);
  }
  const usedPins = new Set(existing.map((m) => m.pin));
  const freshPin = () => {
    for (let i = 0; i < 50; i += 1) {
      const pin = String(1000 + Math.floor(Math.random() * 9000));
      if (!usedPins.has(pin)) { usedPins.add(pin); return pin; }
    }
    throw new Error('Could not allocate a PIN');
  };

  let updated = 0;
  let created = 0;
  const creates = [];
  for (const person of people) {
    const data = {
      name: person.displayName,
      firstName: person.first,
      lastName: person.last,
      email: person.email || `no-email-${person.key.replace(/\s+/g, '-')}@wordconference.local`,
      phone: person.phone,
      chapelId: person.chapel ? chapelId.get(person.chapel.toLowerCase()) : null,
      chapelRole: person.role,
      isActive: true,
    };
    const match = existingByKey.get(person.key);
    if (match) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.member.update({ where: { id: match.id }, data });
      updated += 1;
    } else {
      const pin = freshPin();
      creates.push({ ...data, id: randomUUID(), pin, eventId: event.id, createdBy: admin.id });
    }
  }

  const chunk = 40;
  for (let i = 0; i < creates.length; i += chunk) {
    const slice = creates.slice(i, i + chunk);
    // eslint-disable-next-line no-await-in-loop
    const hashes = await Promise.all(slice.map((m) => bcrypt.hash(m.pin, 12)));
    slice.forEach((m, n) => { m.pinHash = hashes[n]; });
    // eslint-disable-next-line no-await-in-loop
    await prisma.member.createMany({ data: slice });
    created += slice.length;
    console.log(`created ${created}/${creates.length}`);
  }

  const [total, withoutChapel, withoutPin] = await Promise.all([
    prisma.member.count({ where: { eventId: event.id, isActive: true } }),
    prisma.member.count({ where: { eventId: event.id, isActive: true, chapelId: null } }),
    prisma.member.count({ where: { eventId: event.id, isActive: true, OR: [{ pin: null }, { pin: '' }] } }),
  ]);
  console.log(JSON.stringify({ updated, created, total, withoutChapel, withoutPin }));
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
