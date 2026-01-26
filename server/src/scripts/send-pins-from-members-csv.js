const fs = require('fs');
const path = require('path');
require('dotenv').config();

const emailService = require('../services/emailService');

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

const normalize = (value) => String(value || '').trim();

const parseArgs = () => {
  const args = process.argv.slice(2);
  const params = {
    csvPath: path.resolve(__dirname, '../../members-2026-01-24.csv'),
    start: 10,
    end: 500,
    delayMs: 0,
    retry: 1,
    retryDelayMs: 60000,
    onlyLeadersAssistants: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--csv') {
      params.csvPath = path.resolve(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--start') {
      params.start = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--end') {
      params.end = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--delay') {
      params.delayMs = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--retry') {
      params.retry = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--retry-delay') {
      params.retryDelayMs = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--leaders-assistants-only') {
      params.onlyLeadersAssistants = true;
    }
  }

  return params;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildMemberPayload = (row) => {
  const name = normalize(row['Name']);
  const email = normalize(row['Email']);
  const pin = normalize(row['PIN']);
  const chariotName = normalize(row['Chariot']);
  const chariotRole = normalize(row['Chariot Role']);
  const leaderName = normalize(row['Chariot Leader']);
  const leaderEmail = normalize(row['Chariot Leader Email']);

  const member = {
    id: null,
    name,
    email,
    pin,
  };

  const role = chariotRole.toLowerCase();
  if (role === 'leader') {
    member.chariotLeader = [{ name: chariotName || 'Chariot' }];
  } else if (role === 'assistant') {
    member.chariotAssistants = [
      {
        chariot: {
          name: chariotName || 'Chariot',
          leader: {
            name: leaderName || 'Not assigned',
            email: leaderEmail || '',
          },
        },
      },
    ];
  } else if (role === 'member' || chariotName) {
    member.chariotMembers = [
      {
        chariot: {
          name: chariotName || 'Chariot',
          leader: {
            name: leaderName || 'Not assigned',
            email: leaderEmail || '',
          },
        },
      },
    ];
  } else {
    member.chariotLeader = [];
    member.chariotAssistants = [];
    member.chariotMembers = [];
  }

  return member;
};

const main = async () => {
  const { csvPath, start, end, delayMs, retry, retryDelayMs, onlyLeadersAssistants } = parseArgs();
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing data rows.');
  }

  const header = parseCsvLine(lines[0]).map((col) => col.trim());
  const dataLines = lines.slice(1);

  const rows = dataLines.map((line) => {
    const values = parseCsvLine(line);
    return header.reduce((acc, key, index) => {
      acc[key] = values[index] || '';
      return acc;
    }, {});
  });

  const totalRows = rows.length;
  const startIndex = Math.max(start, 1);
  const endIndex = Math.min(end, totalRows);

  console.log(`CSV: ${csvPath}`);
  console.log(`Total rows: ${totalRows}`);
  console.log(`Sending emails for rows ${startIndex} to ${endIndex}`);
  if (onlyLeadersAssistants) {
    console.log('Filter: Leaders and Assistants only');
  }
  console.log(`Delay between sends: ${delayMs}ms`);
  console.log(`Retry on rate limit: ${retry} time(s), wait ${retryDelayMs}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let sent = 0;
  let failed = 0;

  for (let i = startIndex; i <= endIndex; i += 1) {
    const row = rows[i - 1];
    const member = buildMemberPayload(row);
    const role = normalize(row['Chariot Role']).toLowerCase();

    if (onlyLeadersAssistants && role !== 'leader' && role !== 'assistant') {
      continue;
    }

    if (!member.name || !member.email || !member.pin) {
      console.warn(`Row ${i}: Skipping (missing name/email/pin)`);
      failed += 1;
      continue;
    }

    let attempt = 0;
    let delivered = false;

    while (attempt <= retry && !delivered) {
      try {
        await emailService.sendPin(member);
        console.log(`✅ Row ${i}: Sent to ${member.name} <${member.email}>`);
        sent += 1;
        delivered = true;
      } catch (error) {
        attempt += 1;
        const message = error?.message || String(error);
        const isRateLimit =
          message.includes('limit') ||
          message.includes('Sending limit') ||
          message.includes('Policy Rejection');

        console.error(`❌ Row ${i}: Failed to send to ${member.email} (attempt ${attempt}/${retry + 1})`);
        console.error(`   ${message}`);

        if (isRateLimit && attempt <= retry) {
          console.log(`⏳ Waiting ${retryDelayMs}ms before retry...`);
          await sleep(retryDelayMs);
        } else {
          failed += 1;
          break;
        }
      }
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
};

main().catch((error) => {
  console.error('Failed to send emails from CSV:', error);
  process.exitCode = 1;
});
