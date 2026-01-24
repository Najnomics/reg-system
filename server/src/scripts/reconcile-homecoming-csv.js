const fs = require('fs');
const path = require('path');
const prisma = require('../config/database');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../homecoming_clean_dedup_name_email_ticket_coupon.csv'
);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const deleteInactive = args.includes('--delete-inactive');
  const csvPath = args.find((arg) => !arg.startsWith('--')) || DEFAULT_CSV_PATH;
  return { csvPath, deleteInactive };
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

const loadCsvRows = (csvPath) => {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((col) => col.trim().toLowerCase());
  const nameIndex = header.indexOf('name');
  const emailIndex = header.indexOf('email');

  if (nameIndex === -1 || emailIndex === -1) {
    throw new Error('CSV must include "name" and "email" columns.');
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      name: values[nameIndex] ? values[nameIndex].trim() : '',
      email: values[emailIndex] ? values[emailIndex].trim() : '',
    };
  });
};

const main = async () => {
  const { csvPath, deleteInactive } = parseArgs();
  const rows = loadCsvRows(csvPath);

  const csvEmails = new Set();
  const csvNames = new Set();
  let missingName = 0;
  let missingEmail = 0;

  rows.forEach((row) => {
    const name = normalizeName(row.name);
    const email = normalizeEmail(row.email);
    if (!name) missingName += 1;
    if (!email) missingEmail += 1;
    if (name) csvNames.add(name);
    if (email) csvEmails.add(email);
  });

  const members = await prisma.member.findMany({
    select: { id: true, name: true, email: true, isActive: true },
  });

  const inactiveMembers = members.filter(member => member.isActive === false);
  const activeMembers = members.filter(member => member.isActive !== false);

  let matchedActive = 0;
  let matchedInactive = 0;
  let csvOnly = 0;
  let dbOnlyActive = 0;
  let dbOnlyInactive = 0;

  const dbMatched = new Set();

  members.forEach((member) => {
    const name = normalizeName(member.name);
    const email = normalizeEmail(member.email);
    const matched = (email && csvEmails.has(email)) || (name && csvNames.has(name));
    if (matched) {
      dbMatched.add(member.id);
      if (member.isActive === false) {
        matchedInactive += 1;
      } else {
        matchedActive += 1;
      }
    }
  });

  rows.forEach((row) => {
    const name = normalizeName(row.name);
    const email = normalizeEmail(row.email);
    const matched = members.some((member) => {
      const memberName = normalizeName(member.name);
      const memberEmail = normalizeEmail(member.email);
      return (email && email === memberEmail) || (name && name === memberName);
    });
    if (!matched) csvOnly += 1;
  });

  members.forEach((member) => {
    if (!dbMatched.has(member.id)) {
      if (member.isActive === false) {
        dbOnlyInactive += 1;
      } else {
        dbOnlyActive += 1;
      }
    }
  });

  console.log('CSV:', csvPath);
  console.log('CSV rows:', rows.length);
  console.log('CSV missing name:', missingName);
  console.log('CSV missing email:', missingEmail);
  console.log('DB members:', members.length);
  console.log('DB active:', activeMembers.length);
  console.log('DB inactive:', inactiveMembers.length);
  console.log('Matched in DB (active):', matchedActive);
  console.log('Matched in DB (inactive):', matchedInactive);
  console.log('CSV-only (not in DB):', csvOnly);
  console.log('DB-only active (not in CSV):', dbOnlyActive);
  console.log('DB-only inactive (not in CSV):', dbOnlyInactive);

  if (deleteInactive) {
    const result = await prisma.member.deleteMany({
      where: { isActive: false },
    });
    console.log('Deleted inactive members:', result.count);
  }
};

main()
  .catch((error) => {
    console.error('Failed to reconcile CSV:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
