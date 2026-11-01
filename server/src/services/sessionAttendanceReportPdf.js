const { roleLabel, ROLE_KEYS, sortChapelNames } = require('./conferenceAttendance');

const NAVY = '#1B365D';
const NAVY_MID = '#2C5282';
const GOLD = '#C4A35A';
const GREEN = '#1F7A4D';
const GREEN_BG = '#E8F5EE';
const RED = '#B42318';
const RED_BG = '#FDECEC';
const SLATE = '#334155';
const MUTED = '#64748B';
const LINE = '#D6DEE8';
const ROW_ALT = '#F4F7FB';
const WHITE = '#FFFFFF';

const PAGE = {
  left: 42,
  right: 553,
  width: 511,
  top: 52,
  bottom: 790,
};

const ROLE_ROWS = [
  { key: 'ALL', label: 'All roles' },
  { key: 'INVITEE', label: 'Invitees' },
  { key: 'MEMBER', label: 'Members' },
  { key: 'WORKER', label: 'Workers' },
  { key: 'CHAPEL_LEADER', label: 'Chapel leaders' },
  { key: 'SUB_LEADER', label: 'Sub-leaders' },
  { key: 'NONE', label: 'No role assigned' },
  { key: 'MEMBERS_INVITEES', label: 'Members + invitees' },
];

const emptyBucket = () => ({ present: 0, absent: 0 });

const newTally = () => ({
  ALL: emptyBucket(),
  INVITEE: emptyBucket(),
  MEMBER: emptyBucket(),
  WORKER: emptyBucket(),
  CHAPEL_LEADER: emptyBucket(),
  SUB_LEADER: emptyBucket(),
  NONE: emptyBucket(),
  MEMBERS_INVITEES: emptyBucket(),
});

const addPerson = (tally, person) => {
  const side = person.present ? 'present' : 'absent';
  tally.ALL[side] += 1;
  const role = tally[person.chapelRole] ? person.chapelRole : 'NONE';
  tally[role][side] += 1;
  if (person.chapelRole === 'MEMBER' || person.chapelRole === 'INVITEE') {
    tally.MEMBERS_INVITEES[side] += 1;
  }
};

const totalOf = (bucket) => bucket.present + bucket.absent;

const rateOf = (bucket) => {
  const total = totalOf(bucket);
  if (!total) return '—';
  return `${Math.round((bucket.present / total) * 100)}%`;
};

const formatWhen = (value) => new Date(value).toLocaleString('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const ensureSpace = (doc, needed) => {
  if (doc.y + needed <= PAGE.bottom) return;
  doc.addPage();
  doc.y = PAGE.top;
};

const drawFooter = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(i);
    doc.rect(0, 820, 595, 22).fill(NAVY);
    cell(doc, 'Grace Edge Ministries  ·  Internal attendance report', PAGE.left, 826, 320, {
      color: WHITE,
      size: 8,
    });
    cell(doc, `Page ${i + 1} of ${range.count}`, 360, 826, PAGE.right - 360, {
      color: WHITE,
      size: 8,
      align: 'right',
    });
  }
};

const currentPageIndex = (doc) => {
  const range = doc.bufferedPageRange();
  return range.start + range.count - 1;
};

const sectionTitle = (doc, title, subtitle) => {
  doc.y = Math.max(doc.y, PAGE.top);
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(title, PAGE.left, doc.y, {
    width: PAGE.width,
  });
  if (subtitle) {
    doc.moveDown(0.25);
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(subtitle, PAGE.left, doc.y, {
      width: PAGE.width,
    });
  }
  doc.moveDown(0.35);
  doc.rect(PAGE.left, doc.y, 56, 2.5).fill(GOLD);
  doc.y += 12;
};

const markHere = (doc, toc, title, level = 1) => {
  const pageIndex = currentPageIndex(doc);
  const destName = `sec${toc.length}`;
  toc.push({
    title,
    pageIndex,
    level,
    destName,
    pageDict: doc.page.dictionary,
  });
  try {
    doc.addNamedDestination(destName, 'XYZ', PAGE.left, PAGE.top);
  } catch (_) {
    // goTo still uses the stored page dictionary
  }
};

const addJumpLink = (doc, x, y, w, h, entry) => {
  if (entry.destName) {
    doc.goTo(x, y, w, h, entry.destName);
  }
  if (entry.pageDict) {
    const action = doc.ref({
      S: 'GoTo',
      D: [entry.pageDict, 'XYZ', null, null, null],
    });
    action.end();
    doc.annotate(x, y, w, h, { Subtype: 'Link', A: action });
  }
};

const startMajor = (doc, toc, title, subtitle) => {
  doc.addPage();
  doc.y = PAGE.top;
  markHere(doc, toc, title, 0);
  try {
    doc.outline.addItem(title);
  } catch (_) {
    // outline is optional
  }
  sectionTitle(doc, title, subtitle);
};

const drawTableOfContents = (doc, toc, tocPageIndexes) => {
  const rowH = 22;
  let slot = 0;
  const openTocPage = () => {
    doc.switchToPage(tocPageIndexes[Math.min(slot, tocPageIndexes.length - 1)]);
    doc._ctm = [1, 0, 0, 1, 0, 0];
    doc.transform(1, 0, 0, -1, 0, doc.page.height);
    doc.y = PAGE.top;
    if (slot === 0) {
      sectionTitle(doc, 'Table of contents', 'Click a line to jump to that section.');
    }
  };

  openTocPage();
  toc.forEach((entry) => {
    if (doc.y + rowH > PAGE.bottom) {
      slot += 1;
      if (slot < tocPageIndexes.length) openTocPage();
      else {
        doc.addPage();
        tocPageIndexes.push(currentPageIndex(doc));
        doc.y = PAGE.top;
      }
    }
    const y = doc.y;
    const indent = 8 + (entry.level || 0) * 18;
    const pageLabel = String(entry.pageIndex + 1);
    doc.rect(PAGE.left, y, PAGE.width, rowH).fill(entry.level === 0 ? ROW_ALT : WHITE);
    doc.fillColor(entry.level ? '#1D4E89' : NAVY)
      .font(entry.level ? 'Helvetica' : 'Helvetica-Bold')
      .fontSize(entry.level ? 9 : 10)
      .text(entry.title, PAGE.left + indent, y + 5, {
        width: 390 - indent,
        lineBreak: false,
        underline: true,
        goTo: entry.destName,
      });
    doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text(pageLabel, PAGE.right - 50, y + 5, {
      width: 42,
      align: 'right',
      lineBreak: false,
      goTo: entry.destName,
    });
    addJumpLink(doc, PAGE.left, y, PAGE.width, rowH, entry);
    doc.y = y + rowH;
  });
};

const cell = (doc, text, x, y, width, { color = SLATE, bold = false, align = 'left', size = 9 } = {}) => {
  doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  doc.text(String(text ?? ''), x, y, {
    width,
    align,
    lineBreak: false,
    baseline: 'top',
  });
};

const drawTable = (doc, columns, rows) => {
  const rowH = 20;
  const headerH = 22;

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE.left, y, PAGE.width, headerH).fill(NAVY);
    let x = PAGE.left;
    columns.forEach((col) => {
      cell(doc, col.label, x + 6, y + 6, col.width - 12, {
        color: WHITE,
        bold: true,
        align: col.align || 'left',
        size: 8.5,
      });
      x += col.width;
    });
    doc.y = y + headerH;
  };

  ensureSpace(doc, headerH + rowH + 8);
  drawHeader();

  rows.forEach((row, index) => {
    if (doc.y + rowH > PAGE.bottom) {
      doc.addPage();
      doc.y = PAGE.top;
      drawHeader();
    }
    const y = doc.y;
    const bg = row.emphasis === 'green'
      ? GREEN_BG
      : row.emphasis === 'red'
        ? RED_BG
        : index % 2 === 0 ? WHITE : ROW_ALT;
    doc.rect(PAGE.left, y, PAGE.width, rowH).fill(bg);
    doc.rect(PAGE.left, y + rowH - 0.4, PAGE.width, 0.4).fill(LINE);
    let x = PAGE.left;
    columns.forEach((col) => {
      let color = SLATE;
      if (col.key === 'present' || col.key === 'returningPresent' || col.key === 'newCount') color = GREEN;
      if (col.key === 'absent' || col.key === 'returningAbsent') color = RED;
      if (col.key === 'label' || col.key === 'name') color = NAVY;
      cell(doc, row[col.key], x + 6, y + 5.5, col.width - 12, {
        color,
        bold: Boolean(row.bold || col.key === 'label'),
        align: col.align || 'left',
      });
      x += col.width;
    });
    doc.y = y + rowH;
  });
  doc.y += 8;
};

const metricRows = (tally, { includeEmptyRoles = false } = {}) => {
  return ROLE_ROWS
    .filter((role) => {
      if (role.key === 'ALL' || role.key === 'MEMBERS_INVITEES') return true;
      if (includeEmptyRoles) return true;
      return totalOf(tally[role.key]) > 0;
    })
    .map((role) => {
      const bucket = tally[role.key];
      return {
        label: role.label,
        present: bucket.present,
        absent: bucket.absent,
        total: totalOf(bucket),
        rate: rateOf(bucket),
        bold: role.key === 'ALL' || role.key === 'MEMBERS_INVITEES',
        emphasis: role.key === 'MEMBERS_INVITEES' ? 'green' : undefined,
      };
    });
};

const summaryColumns = [
  { key: 'label', label: 'Category', width: 191 },
  { key: 'present', label: 'Present', width: 80, align: 'right' },
  { key: 'absent', label: 'Absent', width: 80, align: 'right' },
  { key: 'total', label: 'Registered', width: 80, align: 'right' },
  { key: 'rate', label: 'Present %', width: 80, align: 'right' },
];

const chapelCountColumns = [
  { key: 'name', label: 'Chapel', width: 119 },
  { key: 'total', label: 'Unique', width: 56, align: 'right' },
  { key: 'CHAPEL_LEADER', label: 'Leaders', width: 56, align: 'right' },
  { key: 'SUB_LEADER', label: 'Sub-ldrs', width: 56, align: 'right' },
  { key: 'WORKER', label: 'Workers', width: 56, align: 'right' },
  { key: 'MEMBER', label: 'Members', width: 56, align: 'right' },
  { key: 'INVITEE', label: 'Invitees', width: 56, align: 'right' },
  { key: 'NONE', label: 'No role', width: 56, align: 'right' },
];

const compareColumns = [
  { key: 'label', label: 'Category', width: 151 },
  { key: 'present', label: 'Present', width: 90, align: 'right' },
  { key: 'newCount', label: 'New', width: 90, align: 'right' },
  { key: 'returningPresent', label: 'Past present', width: 90, align: 'right' },
  { key: 'returningAbsent', label: 'Past absent', width: 90, align: 'right' },
];

const nameColumns = [
  { key: 'n', label: '#', width: 36, align: 'right' },
  { key: 'name', label: 'Name', width: 220 },
  { key: 'chapelName', label: 'Chapel', width: 140 },
  { key: 'role', label: 'Role', width: 115 },
];

const sumChapelRows = (rows) => {
  const totals = { name: 'All chapels', total: 0, ...Object.fromEntries(ROLE_KEYS.map((key) => [key, 0])) };
  for (const row of rows || []) {
    totals.total += row.total || 0;
    ROLE_KEYS.forEach((key) => {
      totals[key] += row[key] || 0;
    });
  }
  return totals;
};

const chapelTableRows = (rows) => {
  const list = rows || [];
  if (!list.length) return [{ name: 'None', total: 0, CHAPEL_LEADER: 0, SUB_LEADER: 0, WORKER: 0, MEMBER: 0, INVITEE: 0, NONE: 0 }];
  return [...list, { ...sumChapelRows(list), bold: true }];
};

const findChapel = (rows, name) => (rows || []).find((row) => row.name === name) || {
  name, total: 0, CHAPEL_LEADER: 0, SUB_LEADER: 0, WORKER: 0, MEMBER: 0, INVITEE: 0, NONE: 0,
};

const roleRowLabel = (key) => ({
  CHAPEL_LEADER: 'Chapel leaders',
  SUB_LEADER: 'Sub-leaders',
  WORKER: 'Workers',
  MEMBER: 'Members',
  INVITEE: 'Invitees',
  NONE: 'No role assigned',
}[key] || key);

const compareRows = (compare, chapelName) => {
  const present = chapelName ? findChapel(compare.presentByChapel, chapelName) : sumChapelRows(compare.presentByChapel);
  const fresh = chapelName ? findChapel(compare.newByChapel, chapelName) : sumChapelRows(compare.newByChapel);
  const back = chapelName ? findChapel(compare.returningPresentByChapel, chapelName) : sumChapelRows(compare.returningPresentByChapel);
  const missed = chapelName ? findChapel(compare.returningAbsentByChapel, chapelName) : sumChapelRows(compare.returningAbsentByChapel);
  const rows = [{
    label: 'All roles',
    present: present.total,
    newCount: fresh.total,
    returningPresent: back.total,
    returningAbsent: missed.total,
    bold: true,
  }];
  ROLE_KEYS.forEach((key) => {
    if (!present[key] && !fresh[key] && !back[key] && !missed[key]) return;
    rows.push({
      label: roleRowLabel(key),
      present: present[key],
      newCount: fresh[key],
      returningPresent: back[key],
      returningAbsent: missed[key],
    });
  });
  return rows;
};

const drawNameList = (doc, people) => {
  const rows = (people || []).map((person, index) => ({
    n: index + 1,
    name: person.name,
    chapelName: person.chapelName,
    role: roleLabel(person.chapelRole),
  }));
  if (!rows.length) {
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(9).text('No people in this group.', PAGE.left, doc.y);
    doc.y += 16;
    return;
  }
  drawTable(doc, nameColumns, rows);
};

const writeSessionAttendanceReport = (doc, { session, event, people, report = {} }) => {
  const overall = newTally();
  const byChapel = new Map();

  for (const person of people) {
    addPerson(overall, person);
    const chapelName = person.chapelName || 'Unassigned';
    if (!byChapel.has(chapelName)) byChapel.set(chapelName, newTally());
    addPerson(byChapel.get(chapelName), person);
  }

  const chapelNames = [...byChapel.keys()].sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  doc.rect(0, 0, 595, 118).fill(NAVY);
  doc.rect(0, 118, 595, 5).fill(GOLD);
  cell(doc, (event?.name || 'Word Conference').toUpperCase(), PAGE.left, 22, PAGE.width, {
    color: GOLD,
    bold: true,
    size: 9,
  });
  cell(doc, 'Session Attendance Report', PAGE.left, 40, PAGE.width, {
    color: WHITE,
    bold: true,
    size: 22,
  });
  cell(doc, session.theme, PAGE.left, 70, PAGE.width, {
    color: '#D6E4F5',
    size: 11,
  });
  cell(doc, `${formatWhen(session.startTime)}  –  ${formatWhen(session.endTime)}`, PAGE.left, 90, PAGE.width, {
    color: '#D6E4F5',
    size: 9,
  });

  doc.y = 140;

  const cards = [
    { label: 'Registered', value: totalOf(overall.ALL), color: NAVY },
    { label: 'Present', value: overall.ALL.present, color: GREEN },
    { label: 'Absent', value: overall.ALL.absent, color: RED },
    { label: 'Present %', value: rateOf(overall.ALL), color: NAVY_MID },
  ];
  const cardW = 118;
  const gap = 13;
  const cardY = doc.y;
  cards.forEach((card, index) => {
    const x = PAGE.left + index * (cardW + gap);
    doc.roundedRect(x, cardY, cardW, 52, 4).fillAndStroke(WHITE, LINE);
    doc.rect(x, cardY, 4, 52).fill(card.color);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(card.label.toUpperCase(), x + 12, cardY + 10, {
      width: cardW - 20,
    });
    doc.fillColor(card.color).font('Helvetica-Bold').fontSize(18).text(String(card.value), x + 12, cardY + 24, {
      width: cardW - 20,
    });
  });
  doc.y = cardY + 68;

  const toc = [];
  const tocPageIndexes = [];
  doc.addPage();
  tocPageIndexes.push(currentPageIndex(doc));
  doc.addPage();
  tocPageIndexes.push(currentPageIndex(doc));

  startMajor(doc, toc, '1.  Overall summary', 'Everyone registered for this event, grouped by role.');
  drawTable(doc, summaryColumns, metricRows(overall, { includeEmptyRoles: true }));

  startMajor(
    doc,
    toc,
    '2.  Chapel breakdown',
    'For each chapel: all roles, then each role, then members and invitees combined.',
  );

  chapelNames.forEach((name) => {
    const tally = byChapel.get(name);
    const chapelTotal = totalOf(tally.ALL);
    ensureSpace(doc, 96);
    markHere(doc, toc, `Chapel: ${name}`, 1);
    const bannerY = doc.y;
    doc.roundedRect(PAGE.left, bannerY, PAGE.width, 26, 3).fill(NAVY_MID);
    cell(doc, name, PAGE.left + 10, bannerY + 7, 220, { color: WHITE, bold: true, size: 11 });
    cell(
      doc,
      `${tally.ALL.present} present   ·   ${tally.ALL.absent} absent   ·   ${chapelTotal} registered`,
      PAGE.left + 230,
      bannerY + 8,
      270,
      { color: WHITE, size: 8.5, align: 'right' },
    );
    doc.y = bannerY + 32;
    drawTable(doc, summaryColumns, metricRows(tally));
  });

  const uniqueTotal = report.uniqueTotal || 0;
  const uniqueByChapel = report.uniqueByChapel || [];
  const uniquePeople = report.uniquePeople || [];
  const compare = report.sessionCompare || {
    firstTimeCount: 0,
    returningPresent: 0,
    returningAbsent: 0,
    pastAttendees: 0,
    presentPeople: [],
    newPeople: [],
    returningPresentPeople: [],
    returningAbsentPeople: [],
    presentByChapel: [],
    newByChapel: [],
    returningPresentByChapel: [],
    returningAbsentByChapel: [],
  };

  startMajor(
    doc,
    toc,
    '3.  Unique people at this event so far',
    'Each person is counted once if they checked in on any conference day from Day 1 onward.',
  );
  const uniqueCards = [
    { label: 'Unique people', value: uniqueTotal, color: NAVY },
    { label: 'This session present', value: compare.presentPeople.length, color: GREEN },
    { label: 'New this session', value: compare.firstTimeCount, color: NAVY_MID },
    { label: 'Past absent today', value: compare.returningAbsent, color: RED },
  ];
  const uniqueCardY = doc.y;
  uniqueCards.forEach((card, index) => {
    const x = PAGE.left + index * 131;
    doc.roundedRect(x, uniqueCardY, 118, 52, 4).fillAndStroke(WHITE, LINE);
    doc.rect(x, uniqueCardY, 4, 52).fill(card.color);
    cell(doc, card.label.toUpperCase(), x + 12, uniqueCardY + 10, 98, { color: MUTED, size: 7.5 });
    cell(doc, card.value, x + 12, uniqueCardY + 24, 98, { color: card.color, bold: true, size: 18 });
  });
  doc.y = uniqueCardY + 68;
  drawTable(doc, chapelCountColumns, chapelTableRows(uniqueByChapel));

  startMajor(
    doc,
    toc,
    '4.  This session compared with earlier days',
    'Present = checked in today. New = first conference check-in. Past present / past absent = came on an earlier day.',
  );
  drawTable(doc, compareColumns, compareRows(compare));

  const compareChapels = sortChapelNames([...new Set([
    ...(compare.presentByChapel || []).map((row) => row.name),
    ...(compare.newByChapel || []).map((row) => row.name),
    ...(compare.returningPresentByChapel || []).map((row) => row.name),
    ...(compare.returningAbsentByChapel || []).map((row) => row.name),
  ])]);
  compareChapels.forEach((name) => {
    ensureSpace(doc, 90);
    markHere(doc, toc, `Earlier days compared: ${name}`, 1);
    const bannerY = doc.y;
    doc.roundedRect(PAGE.left, bannerY, PAGE.width, 22, 3).fill(NAVY_MID);
    cell(doc, name, PAGE.left + 10, bannerY + 5, PAGE.width - 20, { color: WHITE, bold: true, size: 10 });
    doc.y = bannerY + 28;
    drawTable(doc, compareColumns, compareRows(compare, name));
  });

  startMajor(doc, toc, '5.  Unique people who have attended so far', `Full list of ${uniqueTotal} people, with chapel and role.`);
  drawNameList(doc, uniquePeople);

  startMajor(doc, toc, '6.  People present in this session', `${compare.presentPeople.length} checked in, with chapel and role.`);
  drawNameList(doc, compare.presentPeople);

  startMajor(doc, toc, '7.  New in this session', `${compare.newPeople.length} first-time conference check-ins.`);
  drawNameList(doc, compare.newPeople);

  startMajor(doc, toc, '8.  From earlier sessions, present today', `${compare.returningPresentPeople.length} people.`);
  drawNameList(doc, compare.returningPresentPeople);

  startMajor(doc, toc, '9.  From earlier sessions, absent today', `${compare.returningAbsentPeople.length} people.`);
  drawNameList(doc, compare.returningAbsentPeople);

  startMajor(doc, toc, 'Notes', 'How to read this report.');
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(
    `Prepared ${formatWhen(new Date())}. Counts use active registered people only. “No role assigned” is people with no chapel role. “Unassigned” is people with no chapel. Click any line in the table of contents to open that section.`,
    PAGE.left,
    doc.y,
    { width: PAGE.width },
  );

  drawTableOfContents(doc, toc, tocPageIndexes);
  drawFooter(doc);
};

module.exports = {
  writeSessionAttendanceReport,
};
