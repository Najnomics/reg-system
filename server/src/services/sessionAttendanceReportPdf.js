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

const sectionTitle = (doc, title, subtitle) => {
  ensureSpace(doc, 42);
  doc.y += 8;
  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(title, PAGE.left, doc.y, {
    width: PAGE.width,
  });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(subtitle, PAGE.left, doc.y, {
      width: PAGE.width,
    });
  }
  doc.moveDown(0.35);
  doc.rect(PAGE.left, doc.y, 56, 2.5).fill(GOLD);
  doc.y += 10;
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
      if (col.key === 'present') color = GREEN;
      if (col.key === 'absent') color = RED;
      if (col.key === 'label') color = NAVY;
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

const writeSessionAttendanceReport = (doc, { session, event, people }) => {
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

  sectionTitle(doc, '1.  Overall summary', 'Everyone registered for this event, grouped by role.');
  drawTable(doc, summaryColumns, metricRows(overall, { includeEmptyRoles: true }));

  sectionTitle(
    doc,
    '2.  Chapel breakdown',
    'For each chapel: all roles, then each role, then members and invitees combined.',
  );

  chapelNames.forEach((name) => {
    const tally = byChapel.get(name);
    const chapelTotal = totalOf(tally.ALL);
    ensureSpace(doc, 96);
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

  ensureSpace(doc, 36);
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8).text(
    `Prepared ${formatWhen(new Date())}. Counts use active registered people only. “No role assigned” is people with no chapel role. “Unassigned” is people with no chapel.`,
    PAGE.left,
    doc.y,
    { width: PAGE.width },
  );

  drawFooter(doc);
};

module.exports = {
  writeSessionAttendanceReport,
};
