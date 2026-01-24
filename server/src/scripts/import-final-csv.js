const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const prisma = require('../config/database');
const { generateMemberPin } = require('../utils/pinGenerator');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../final_1.csv'
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
  const useDirect = args.includes('--use-direct');
  const csvPath = args.find((arg) => !arg.startsWith('--')) || DEFAULT_CSV_PATH;
  return { csvPath, dryRun, useDirect };
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

const normalizeEmail = (value) =>
  String(value || '').toLowerCase().trim();

const parseTicketTotal = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
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
  const nameIndex =
    header.indexOf('name') !== -1 ? header.indexOf('name') : header.indexOf('names');
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

const main = async () => {
  const { csvPath, dryRun, useDirect } = parseArgs();
  if (useDirect && process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }
  const rows = loadCsvRows(csvPath);

  console.log('Loaded CSV rows:', rows.length);

  const admin = await prisma.admin.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
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

  const summary = {
    totalRows: rows.length,
    createdMembers: 0,
    existingMembers: 0,
    missingName: 0,
    missingEmail: 0,
    workersMarked: 0,
    inviteesAssigned: 0,
    membersMarked: 0,
    skippedAssigned: 0,
    missingChapel: 0,
    unknownCoupon: 0,
  };

  let processed = 0;

  for (const row of rows) {
    const normalizedName = normalizeName(row.name);
    if (!normalizedName) {
      summary.missingName += 1;
      continue;
    }

    const normalizedEmail = normalizeEmail(row.email);
    let member = membersByName.get(normalizedName) || membersByEmail.get(normalizedEmail);

    if (!member) {
      if (!normalizedEmail) {
        summary.missingEmail += 1;
        continue;
      }

      const { pin, pinHash } = await generateMemberPin();
      const memberData = {
        id: crypto.randomUUID(),
        name: row.name.trim(),
        email: normalizedEmail,
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

      membersByName.set(normalizedName, member);
      if (normalizedEmail) membersByEmail.set(normalizedEmail, member);
      summary.createdMembers += 1;
    } else {
      summary.existingMembers += 1;
    }

    const ticketValue = parseTicketTotal(row.ticketTotal);

    if (ticketValue === 10000) {
      if (member.chapelRole !== 'WORKER') {
        if (!dryRun) {
          await prisma.member.update({
            where: { id: member.id },
            data: { chapelRole: 'WORKER' },
          });
        }
        member.chapelRole = 'WORKER';
        summary.workersMarked += 1;
      }
      continue;
    }

    if (ticketValue === 3000) {
      const code = extractCouponCode(row.coupon);
      if (!code) {
        summary.unknownCoupon += 1;
        continue;
      }

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

      if (member.chapelId && member.chapelId !== chapelId) {
        summary.skippedAssigned += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.member.update({
          where: { id: member.id },
          data: { chapelId, chapelRole: 'INVITEE' },
        });
      }

      member.chapelId = chapelId;
      member.chapelRole = 'INVITEE';
      summary.inviteesAssigned += 1;
      continue;
    }

    if (ticketValue === 3500) {
      if (member.chapelRole !== 'MEMBER') {
        if (!dryRun) {
          await prisma.member.update({
            where: { id: member.id },
            data: { chapelRole: 'MEMBER' },
          });
        }
        member.chapelRole = 'MEMBER';
        summary.membersMarked += 1;
      }
    }

    processed += 1;
    if (processed % 100 === 0) {
      console.log(`Processed ${processed} rows...`);
    }
  }

  console.log('CSV:', csvPath);
  console.log('Dry run:', dryRun);
  console.log('Summary:', summary);
};

main()
  .catch((error) => {
    console.error('Failed to import final CSV:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
