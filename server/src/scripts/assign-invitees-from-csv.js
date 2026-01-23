const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../homecoming_conference_2026_names_emails_coupons_dedup.csv'
);

const codeToChapelName = {
  GRACE345: 'Grace',
  POWR8567: 'Power',
  SPIRIT111: 'Spirit',
  REV123: 'Revelations',
  FAITH908: 'Faith',
  LIGHT287: 'Light',
  FIRE222: 'Fire',
  MISSG234: 'Missions and Glory',
  GOSPEL111: 'Gospel',
  TRU82754: 'Truth',
  PSTZUZU345: 'Pst-Charles',
  PROVOST69: 'Provost',
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

  const header = parseCsvLine(lines[0]).map((col) => col.trim());
  const couponIndex = header.indexOf('coupon_code_applied');
  const nameIndex = header.indexOf('name');

  if (nameIndex === -1 || couponIndex === -1) {
    throw new Error(
      'CSV must include "name" and "coupon_code_applied" columns.'
    );
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      name: values[nameIndex] ? values[nameIndex].trim() : '',
      coupon: values[couponIndex] ? values[couponIndex].trim() : '',
    };
  });
};

const normalizeName = (value) => {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
};

const main = async () => {
  const { csvPath, dryRun } = parseArgs();
  const rows = loadCsvRows(csvPath);

  console.log('Loaded CSV rows:', rows.length);

  const chapelNames = [...new Set(Object.values(codeToChapelName))];
  const chapels = await prisma.chapel.findMany({
    where: { name: { in: chapelNames } },
    select: { id: true, name: true },
  });
  const chapelByName = chapels.reduce((acc, chapel) => {
    acc[chapel.name] = chapel.id;
    return acc;
  }, {});

  const missingChapels = chapelNames.filter(
    (name) => !chapelByName[name]
  );
  if (missingChapels.length > 0) {
    console.warn(
      'Missing chapels in DB:',
      missingChapels.join(', ')
    );
  }

  const summary = {
    totalRows: rows.length,
    withCoupon: 0,
    updated: 0,
    alreadyAssigned: 0,
    skippedAssigned: 0,
    missingMember: 0,
    missingName: 0,
    multipleMembers: 0,
    unknownCoupon: 0,
    missingChapel: 0,
  };
  const chapelCounts = {};

  const allMembers = await prisma.member.findMany({
    select: { id: true, name: true, email: true, chapelId: true, chapelRole: true },
  });
  const membersByName = allMembers.reduce((acc, member) => {
    const normalized = normalizeName(member.name);
    if (!normalized) return acc;
    if (!acc[normalized]) acc[normalized] = [];
    acc[normalized].push(member);
    return acc;
  }, {});

  let processedRows = 0;

  for (const row of rows) {
    const normalizedName = normalizeName(row.name);
    if (!normalizedName) {
      summary.missingName += 1;
      continue;
    }

    const code = extractCouponCode(row.coupon);
    if (!code) continue;

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

    const members = membersByName[normalizedName] || [];

    if (!members.length) {
      summary.missingMember += 1;
      continue;
    }

    if (members.length > 1) {
      summary.multipleMembers += 1;
      continue;
    }

    const member = members[0];
    if (member.chapelId && member.chapelId !== chapelId) {
      summary.skippedAssigned += 1;
      continue;
    }

    if (member.chapelId === chapelId && member.chapelRole === 'INVITEE') {
      summary.alreadyAssigned += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          chapelId,
          chapelRole: 'INVITEE',
        },
      });
    }

    summary.updated += 1;
    chapelCounts[chapelName] = (chapelCounts[chapelName] || 0) + 1;

    processedRows += 1;
    if (processedRows % 50 === 0) {
      console.log(`Processed ${processedRows} rows...`);
    }
  }

  console.log('CSV:', csvPath);
  console.log('Dry run:', dryRun);
  console.log('Summary:', summary);
  console.log('Updates by chapel:', chapelCounts);
};

main()
  .catch((error) => {
    console.error('Failed to assign invitees:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
