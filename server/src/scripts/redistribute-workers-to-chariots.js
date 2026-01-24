const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../homecoming_clean_dedup_name_email_ticket_coupon.csv'
);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const csvPath = args.find((arg) => !arg.startsWith('--')) || DEFAULT_CSV_PATH;
  return { csvPath };
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseTicketTotal = (value) => {
  if (!value) return null;
  const numeric = String(value).replace(/[^0-9]/g, '');
  return numeric ? Number(numeric) : null;
};

const normalizeName = (value) =>
  String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const loadWorkerNames = (csvPath) => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((col) => col.trim());
  const nameIndex = header.indexOf('name');
  const emailIndex = header.indexOf('email');
  const ticketIndex = header.indexOf('ticket_total');

  if (nameIndex === -1 || emailIndex === -1 || ticketIndex === -1) {
    throw new Error('CSV must include "name", "email", and "ticket_total" columns.');
  }

  const names = [];
  lines.slice(1).forEach((line) => {
    const values = parseCsvLine(line);
    const ticketAmount = parseTicketTotal(values[ticketIndex]);
    if (ticketAmount !== 10000) return;
    const name = values[nameIndex] ? values[nameIndex].trim() : '';
    if (name) names.push(name);
  });

  const uniqueByNormalized = new Map();
  names.forEach((name) => {
    const normalized = normalizeName(name);
    if (normalized && !uniqueByNormalized.has(normalized)) {
      uniqueByNormalized.set(normalized, name);
    }
  });

  return Array.from(uniqueByNormalized.values());
};

const main = async () => {
  const { csvPath } = parseArgs();
  const workerNames = loadWorkerNames(csvPath);

  const chariots = await prisma.chariot.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      leaderId: true,
      leader: { select: { name: true } },
      assistants: { select: { memberId: true, member: { select: { name: true } } } },
    },
  });

  if (chariots.length === 0) {
    console.log('No active chariots found. Aborting.');
    return;
  }

  const selectedChariots = chariots.slice(0, 30);
  if (chariots.length !== 30) {
    console.log(
      `Active chariots found: ${chariots.length}. Using ${selectedChariots.length} chariot(s).`
    );
  }

  const occupied = new Set();
  const excludedByName = new Set();
  selectedChariots.forEach((chariot) => {
    if (chariot.leaderId) occupied.add(chariot.leaderId);
    if (chariot.leader?.name) excludedByName.add(normalizeName(chariot.leader.name));
    chariot.assistants.forEach((assistant) => {
      occupied.add(assistant.memberId);
      if (assistant.member?.name) {
        excludedByName.add(normalizeName(assistant.member.name));
      }
    });
  });

  const eligibleWorkerNames = workerNames.filter(
    (name) => !excludedByName.has(normalizeName(name))
  );

  const activeMembers = await prisma.member.findMany({
    where: { isActive: { not: false } },
    select: { id: true, name: true },
  });

  const membersByName = activeMembers.reduce((acc, member) => {
    const normalized = normalizeName(member.name);
    if (!acc[normalized]) acc[normalized] = [];
    acc[normalized].push(member);
    return acc;
  }, {});

  const matchedWorkerIds = [];
  const missingWorkerNames = [];
  const multipleWorkerNames = [];

  eligibleWorkerNames.forEach((name) => {
    const normalized = normalizeName(name);
    const matches = membersByName[normalized] || [];
    if (matches.length === 0) {
      missingWorkerNames.push(name);
      return;
    }
    if (matches.length > 1) {
      multipleWorkerNames.push(name);
    }
    matchedWorkerIds.push(matches[0].id);
  });

  const workerIds = matchedWorkerIds;
  const reassignableWorkerIds = workerIds.filter((id) => !occupied.has(id));

  if (reassignableWorkerIds.length === 0) {
    console.log('No reassignable workers found.');
    return;
  }

  const deleteResult = await prisma.chariotMember.deleteMany();

  const shuffledWorkers = shuffle(reassignableWorkerIds);
  const assignments = shuffledWorkers.map((memberId, index) => ({
    chariotId: selectedChariots[index % selectedChariots.length].id,
    memberId,
  }));

  const createResult = await prisma.chariotMember.createMany({
    data: assignments,
    skipDuplicates: true,
  });

  console.log('CSV:', csvPath);
  console.log('Active chariots:', chariots.length);
  console.log('Chariots used for workers:', selectedChariots.length);
  console.log('Workers (ticket_total=10000, unique names):', workerNames.length);
  console.log('Eligible workers (exclude leaders/assistants):', eligibleWorkerNames.length);
  console.log('Workers matched in DB:', workerIds.length);
  console.log('Workers missing in DB:', missingWorkerNames.length);
  console.log('Workers with multiple matches:', multipleWorkerNames.length);
  console.log('Reassigned workers:', reassignableWorkerIds.length);
  console.log('Deleted existing chariot memberships:', deleteResult.count);
  console.log('Created worker memberships:', createResult.count);
};

main()
  .catch((error) => {
    console.error('Failed to redistribute workers:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
