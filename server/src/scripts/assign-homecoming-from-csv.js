const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

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

const normalizeName = (value) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
};

const normalizeEmail = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

const parseTicketTotal = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return null;
  return parseInt(digits, 10);
};

const extractCouponCode = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  const match = normalized.match(/([A-Z0-9]+)\s*$/);
  return match ? match[1] : null;
};

const loadCsvRows = (csvPath) => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((col) => col.trim().toLowerCase());
  const nameIndex = header.indexOf('name');
  const emailIndex = header.indexOf('email');
  const ticketIndex = header.indexOf('ticket_total');
  const couponIndex =
    header.indexOf('coupon_applied') !== -1
      ? header.indexOf('coupon_applied')
      : header.indexOf('coupon_aplied');

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

const shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const main = async () => {
  const { csvPath, dryRun } = parseArgs();
  const rows = loadCsvRows(csvPath);

  console.log('Loaded CSV rows:', rows.length);

  const admin = await prisma.admin.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });

  if (!admin) {
    throw new Error('No active admin found. Create an admin first.');
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

  const members = await prisma.member.findMany({
    select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
  });

  const membersByName = new Map();
  const membersByEmail = new Map();
  members.forEach((member) => {
    const normalizedName = normalizeName(member.name);
    if (normalizedName) membersByName.set(normalizedName, member);
    const normalizedEmail = normalizeEmail(member.email);
    if (normalizedEmail) membersByEmail.set(normalizedEmail, member);
  });

  const blockedEmails = new Set([
    'nosakhareochuko@gmail.com',
    'dennisozobor@gmail.com',
  ]);

  const summary = {
    totalRows: rows.length,
    createdMembers: 0,
    existingMembers: 0,
    missingName: 0,
    missingEmail: 0,
    withCoupon: 0,
    unknownCoupon: 0,
    missingChapel: 0,
    assignedChapel: 0,
    alreadyAssigned: 0,
    skippedAssigned: 0,
    workerLocked: 0,
    workersMarked: 0,
    workersAlreadyMarked: 0,
  };
  const chapelCounts = {};
  const workerCandidates = new Set();

  let processedRows = 0;

  for (const row of rows) {
    const normalizedName = normalizeName(row.name);
    if (!normalizedName) {
      summary.missingName += 1;
      continue;
    }

    const normalizedEmail = normalizeEmail(row.email);
    let member = membersByName.get(normalizedName);

    if (!member) {
      if (blockedEmails.has(normalizedEmail)) {
        member = membersByEmail.get(normalizedEmail);
        if (!member) {
          summary.missingEmail += 1;
          continue;
        }
      }
    }

    if (!member) {
      if (!normalizedEmail) {
        summary.missingEmail += 1;
        continue;
      }

      if (!dryRun) {
        const { pin, pinHash } = await generateMemberPin();
        member = await prisma.member.create({
          data: {
            id: crypto.randomUUID(),
            name: row.name.trim(),
            email: normalizedEmail,
            pin,
            pinHash,
            isActive: true,
            createdBy: admin.id,
          },
          select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
        });
      } else {
        member = {
          id: `dry-run-${normalizedName}`,
          name: row.name.trim(),
          email: normalizedEmail,
          chapelId: null,
          chapelRole: null,
        };
      }

      membersByName.set(normalizedName, member);
      if (normalizedEmail) membersByEmail.set(normalizedEmail, member);
      summary.createdMembers += 1;
    } else {
      summary.existingMembers += 1;
    }

    const ticketValue = parseTicketTotal(row.ticketTotal);
    const isWorker = ticketValue === 10000;
    if (isWorker && member.id) {
      workerCandidates.add(member.id);
    }

    if (isWorker && member.id) {
      if (member.chapelRole !== 'WORKER') {
        if (!dryRun) {
          await prisma.member.update({
            where: { id: member.id },
            data: { chapelRole: 'WORKER' },
          });
        }
        member.chapelRole = 'WORKER';
        summary.workersMarked += 1;
      } else {
        summary.workersAlreadyMarked += 1;
      }
    }

    const code = extractCouponCode(row.coupon);
    if (!code) {
      continue;
    }

    summary.withCoupon += 1;

    const chapelName = codeToChapelName[code];
    if (!chapelName) {
      summary.unknownCoupon += 1;
      continue;
    }

    const chapelId = chapelByName[chapelName];
    if (!chapelId) {
      summary.missingChapel += 1;
      continue;
    }

    const desiredRole = isWorker ? 'WORKER' : 'INVITEE';

    if (member.chapelId && member.chapelId !== chapelId) {
      summary.skippedAssigned += 1;
      continue;
    }

    if (member.chapelId === chapelId && member.chapelRole === desiredRole) {
      summary.alreadyAssigned += 1;
      continue;
    }

    if (member.chapelRole === 'WORKER' && desiredRole !== 'WORKER') {
      summary.workerLocked += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          chapelId,
          chapelRole: desiredRole,
        },
      });
    }

    member.chapelId = chapelId;
    member.chapelRole = desiredRole;
    summary.assignedChapel += 1;
    chapelCounts[chapelName] = (chapelCounts[chapelName] || 0) + 1;

    processedRows += 1;
    if (processedRows % 50 === 0) {
      console.log(`Processed ${processedRows} rows...`);
    }
  }

  const chariots = await prisma.chariot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      leaderId: true,
      assistants: { select: { memberId: true } },
      members: { select: { memberId: true } },
    },
  });

  const chariotAssignments = [];
  let chariotSkipped = 0;

  if (chariots.length > 0) {
    const occupied = new Set();
    chariots.forEach((chariot) => {
      if (chariot.leaderId) occupied.add(chariot.leaderId);
      chariot.assistants.forEach((assistant) => occupied.add(assistant.memberId));
      chariot.members.forEach((member) => occupied.add(member.memberId));
    });

    const assignableWorkers = shuffle(
      [...workerCandidates].filter((memberId) => {
        if (occupied.has(memberId)) {
          chariotSkipped += 1;
          return false;
        }
        return true;
      })
    );

    assignableWorkers.forEach((memberId, index) => {
      const chariot = chariots[index % chariots.length];
      chariotAssignments.push({ chariotId: chariot.id, memberId });
    });

    if (!dryRun && chariotAssignments.length > 0) {
      await prisma.chariotMember.createMany({
        data: chariotAssignments,
        skipDuplicates: true,
      });
    }
  }

  console.log('CSV:', csvPath);
  console.log('Dry run:', dryRun);
  console.log('Summary:', summary);
  console.log('Updates by chapel:', chapelCounts);
  if (chariots.length === 0) {
    console.log('Chariot assignment: skipped (no active chariots)');
  } else {
    console.log('Chariot assignment:', {
      assigned: chariotAssignments.length,
      skippedExisting: chariotSkipped,
      chariots: chariots.length,
    });
  }
};

main()
  .catch((error) => {
    console.error('Failed to process CSV:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
