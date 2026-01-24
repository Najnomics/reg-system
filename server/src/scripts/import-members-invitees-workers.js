const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/database');
const { generateMemberPin } = require('../utils/pinGenerator');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../homecoming_clean_dedup_name_email_ticket_coupon.csv'
);

const codeToChapelName = {
  TRU82754: 'Truth',
  POWR8567: 'Power',
  FAITH908: 'Faith',
  LIGHT287: 'Light',
  GRACE345: 'Grace',
  MISSG234: 'Missions and Glory',
  REV123: 'Revelations',
  FIRE222: 'Fire',
  SPIRIT111: 'Spirit',
  GOSPEL111: 'Gospel',
  PROVOST69: 'Provost',
  PSTZUZU345: 'Pst-Charles',
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const csvPath = args.find((arg) => !arg.startsWith('--')) || DEFAULT_CSV_PATH;
  return { csvPath, dryRun };
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

const normalizeName = (value) =>
  String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const extractCouponCode = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  const match = normalized.match(/([A-Z0-9]+)\s*$/);
  return match ? match[1] : null;
};

const parseTicketTotal = (value) => {
  if (!value) return null;
  const numeric = String(value).replace(/[^0-9]/g, '');
  return numeric ? Number(numeric) : null;
};

const loadCsvRows = (csvPath) => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((col) => col.trim());
  const nameIndex = header.indexOf('name');
  const emailIndex = header.indexOf('email');
  const ticketIndex = header.indexOf('ticket_total');
  const couponIndex = header.indexOf('coupon_applied');

  if (nameIndex === -1 || emailIndex === -1 || ticketIndex === -1 || couponIndex === -1) {
    throw new Error(
      'CSV must include "name", "email", "ticket_total", and "coupon_applied" columns.'
    );
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      name: values[nameIndex] ? values[nameIndex].trim() : '',
      email: values[emailIndex] ? values[emailIndex].trim() : '',
      ticketTotal: values[ticketIndex] ? values[ticketIndex].trim() : '',
      coupon: values[couponIndex] ? values[couponIndex].trim() : '',
    };
  });
};

const shuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const main = async () => {
  const { csvPath, dryRun } = parseArgs();
  const rows = loadCsvRows(csvPath);

  console.log(`Loaded CSV rows: ${rows.length}`);

  const admin = await prisma.admin.findFirst({
    where: { isActive: true },
    select: { id: true, email: true },
  });

  if (!admin) {
    throw new Error('No active admin found. Please create an admin user first.');
  }

  const chapelNames = [...new Set(Object.values(codeToChapelName))];
  const chapels = await prisma.chapel.findMany({
    where: { name: { in: chapelNames } },
    select: { id: true, name: true },
  });
  const chapelByName = chapels.reduce((acc, chapel) => {
    acc[chapel.name] = chapel.id;
    return acc;
  }, {});

  const missingChapels = chapelNames.filter((name) => !chapelByName[name]);
  if (missingChapels.length > 0) {
    console.warn('Missing chapels in DB:', missingChapels.join(', '));
  }

  const existingMembers = await prisma.member.findMany({
    select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
  });
  const membersByName = existingMembers.reduce((acc, member) => {
    acc[normalizeName(member.name)] = member;
    return acc;
  }, {});

  const summary = {
    totalRows: rows.length,
    missingName: 0,
    createdMembers: 0,
    existingMembers: 0,
    invalidEmail: 0,
    inviteesAssigned: 0,
    inviteesSkippedAssigned: 0,
    inviteesAlreadyAssigned: 0,
    inviteesUnknownCoupon: 0,
    inviteesMissingChapel: 0,
    workersMarked: 0,
    workersAlreadyMarked: 0,
  };
  const workerMemberIds = new Set();
  const chapelCounts = {};

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1} rows...`);
    }

    if (!row.name) {
      summary.missingName += 1;
      continue;
    }

    const normalizedName = normalizeName(row.name);
    let member = membersByName[normalizedName];

    if (!member) {
      if (!row.email || !row.email.includes('@')) {
        summary.invalidEmail += 1;
        continue;
      }

      const { pin, pinHash } = await generateMemberPin();
      const memberData = {
        id: crypto.randomUUID(),
        name: row.name.trim(),
        email: row.email.toLowerCase(),
        pin,
        pinHash,
        isActive: true,
        createdBy: admin.id,
      };

      if (!dryRun) {
        member = await prisma.member.create({
          data: memberData,
          select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
        });
      } else {
        member = { ...memberData, chapelId: null, chapelRole: null };
      }

      membersByName[normalizedName] = member;
      summary.createdMembers += 1;
    } else {
      summary.existingMembers += 1;
    }

    const ticketAmount = parseTicketTotal(row.ticketTotal);
    if (ticketAmount === 10000) {
      workerMemberIds.add(member.id);
      if (member.chapelRole !== 'WORKER') {
        if (!dryRun) {
          member = await prisma.member.update({
            where: { id: member.id },
            data: { chapelRole: 'WORKER' },
            select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
          });
          membersByName[normalizedName] = member;
        }
        summary.workersMarked += 1;
      } else {
        summary.workersAlreadyMarked += 1;
      }

      // Workers are handled separately, skip invitee assignment
      continue;
    }

    const code = extractCouponCode(row.coupon);
    if (!code) {
      continue;
    }

    const chapelName = codeToChapelName[code];
    if (!chapelName) {
      summary.inviteesUnknownCoupon += 1;
      continue;
    }

    const chapelId = chapelByName[chapelName];
    if (!chapelId) {
      summary.inviteesMissingChapel += 1;
      continue;
    }

    if (member.chapelId === chapelId && member.chapelRole === 'INVITEE') {
      summary.inviteesAlreadyAssigned += 1;
      continue;
    }

    if (member.chapelId && member.chapelId !== chapelId) {
      summary.inviteesSkippedAssigned += 1;
      continue;
    }

    if (!dryRun) {
      member = await prisma.member.update({
        where: { id: member.id },
        data: { chapelId, chapelRole: 'INVITEE' },
        select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
      });
      membersByName[normalizedName] = member;
    }

    summary.inviteesAssigned += 1;
    chapelCounts[chapelName] = (chapelCounts[chapelName] || 0) + 1;
  }

  // Assign workers to chariots evenly and randomly
  const workerIds = Array.from(workerMemberIds);
  const chariots = await prisma.chariot.findMany({ select: { id: true, name: true } });

  let workerAssignments = 0;
  let workerSkippedExisting = 0;

  if (workerIds.length > 0 && chariots.length > 0) {
    const existingAssignments = await prisma.chariotMember.findMany({
      where: { memberId: { in: workerIds } },
      select: { memberId: true },
    });
    const assignedIds = new Set(existingAssignments.map((entry) => entry.memberId));

    const unassignedWorkers = workerIds.filter((id) => !assignedIds.has(id));
    workerSkippedExisting = workerIds.length - unassignedWorkers.length;

    const shuffled = shuffle(unassignedWorkers);
    const assignments = shuffled.map((memberId, index) => ({
      memberId,
      chariotId: chariots[index % chariots.length].id,
    }));

    if (!dryRun && assignments.length > 0) {
      await prisma.chariotMember.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    workerAssignments = assignments.length;
  }

  console.log('CSV:', csvPath);
  console.log('Dry run:', dryRun);
  console.log('Summary:', summary);
  console.log('Invitees assigned by chapel:', chapelCounts);
  console.log('Workers assigned to chariots:', {
    totalWorkers: workerIds.length,
    assigned: workerAssignments,
    skippedExisting: workerSkippedExisting,
    totalChariots: chariots.length,
  });
};

main()
  .catch((error) => {
    console.error('Failed to import members:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
