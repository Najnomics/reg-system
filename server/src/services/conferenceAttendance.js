const CONFERENCE_START = new Date('2026-10-30T00:00:00.000Z');

const ROLE_KEYS = ['CHAPEL_LEADER', 'SUB_LEADER', 'WORKER', 'MEMBER', 'INVITEE', 'NONE'];

const ROLE_LABELS = {
  CHAPEL_LEADER: 'Chapel Leader',
  SUB_LEADER: 'Sub-leader',
  WORKER: 'Worker',
  MEMBER: 'Member',
  INVITEE: 'Invitee',
  NONE: 'No role',
};

const roleKey = (value) => (ROLE_KEYS.includes(value) ? value : 'NONE');

const roleLabel = (value) => ROLE_LABELS[roleKey(value)];

const chapelNameOf = (member) => member?.chapel?.name || 'Unassigned';

const emptyRoleCounts = () => Object.fromEntries(ROLE_KEYS.map((key) => [key, 0]));

const sortChapelNames = (names) => [...names].sort((a, b) => {
  if (a === 'Unassigned') return 1;
  if (b === 'Unassigned') return -1;
  return a.localeCompare(b);
});

const sessionWhereForEvent = (event) => {
  const where = { eventId: event.id };
  if (event.slug === 'word-conference') {
    where.OR = [
      { startTime: { gte: CONFERENCE_START } },
      { createdAt: { gte: CONFERENCE_START } },
    ];
  }
  return where;
};

const addRole = (counts, role) => {
  const key = roleKey(role);
  counts[key] += 1;
  counts.total += 1;
};

const chapelRoleTally = (people) => {
  const byChapel = new Map();
  for (const person of people) {
    const chapel = person.chapelName || 'Unassigned';
    if (!byChapel.has(chapel)) byChapel.set(chapel, { total: 0, ...emptyRoleCounts() });
    addRole(byChapel.get(chapel), person.chapelRole);
  }
  return sortChapelNames([...byChapel.keys()]).map((name) => ({
    name,
    ...byChapel.get(name),
  }));
};

const toPerson = (member) => ({
  id: member.id,
  name: member.name || 'Unnamed',
  chapelRole: roleKey(member.chapelRole),
  chapelName: chapelNameOf(member),
});

const loadEventAttendance = async (prisma, event) => {
  const sessionWhere = sessionWhereForEvent(event);
  const [sessions, members, rows] = await Promise.all([
    prisma.session.findMany({
      where: sessionWhere,
      select: { id: true, theme: true, startTime: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.member.findMany({
      where: { eventId: event.id, isActive: { not: false } },
      select: {
        id: true,
        name: true,
        chapelRole: true,
        chapel: { select: { name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { session: sessionWhere },
      select: { memberId: true, sessionId: true, checkedInAt: true },
      orderBy: { checkedInAt: 'asc' },
    }),
  ]);
  return { sessions, members, rows };
};

const buildAttendanceBundle = ({ sessions, members, rows }) => {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const attendeesBySession = new Map();
  const firstSession = new Map();
  for (const row of rows) {
    if (!attendeesBySession.has(row.sessionId)) attendeesBySession.set(row.sessionId, new Set());
    attendeesBySession.get(row.sessionId).add(row.memberId);
    if (!firstSession.has(row.memberId)) firstSession.set(row.memberId, row.sessionId);
  }

  const uniqueIds = [...firstSession.keys()];
  const uniquePeople = uniqueIds
    .map((id) => memberById.get(id))
    .filter(Boolean)
    .map(toPerson)
    .sort((a, b) => a.chapelName.localeCompare(b.chapelName) || a.name.localeCompare(b.name));

  const uniqueByChapel = chapelRoleTally(uniquePeople);
  const sessionStats = new Map();
  const seenPast = new Set();

  for (const session of sessions) {
    const here = attendeesBySession.get(session.id) || new Set();
    const presentPeople = [];
    const newPeople = [];
    const returningPresentPeople = [];
    const returningAbsentPeople = [];

    for (const memberId of here) {
      const member = memberById.get(memberId);
      if (!member) continue;
      const person = toPerson(member);
      presentPeople.push(person);
      if (firstSession.get(memberId) === session.id) newPeople.push(person);
      else returningPresentPeople.push(person);
    }
    for (const memberId of seenPast) {
      if (here.has(memberId)) continue;
      const member = memberById.get(memberId);
      if (member) returningAbsentPeople.push(toPerson(member));
    }

    const sortPeople = (list) => list.sort((a, b) => (
      a.chapelName.localeCompare(b.chapelName) || a.name.localeCompare(b.name)
    ));

    sessionStats.set(session.id, {
      firstTimeCount: newPeople.length,
      returningPresent: returningPresentPeople.length,
      returningAbsent: returningAbsentPeople.length,
      pastAttendees: seenPast.size,
      presentPeople: sortPeople(presentPeople),
      newPeople: sortPeople(newPeople),
      returningPresentPeople: sortPeople(returningPresentPeople),
      returningAbsentPeople: sortPeople(returningAbsentPeople),
      presentByChapel: chapelRoleTally(presentPeople),
      newByChapel: chapelRoleTally(newPeople),
      returningPresentByChapel: chapelRoleTally(returningPresentPeople),
      returningAbsentByChapel: chapelRoleTally(returningAbsentPeople),
    });

    for (const memberId of here) seenPast.add(memberId);
  }

  return {
    uniqueTotal: uniquePeople.length,
    uniqueByChapel,
    uniquePeople,
    sessionStats,
  };
};

const getEventAttendanceBundle = async (prisma, event) => {
  const loaded = await loadEventAttendance(prisma, event);
  return buildAttendanceBundle(loaded);
};

const emptySessionStats = () => ({
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
});

const statsForSession = (bundle, sessionId) => (
  bundle.sessionStats.get(sessionId) || emptySessionStats()
);

module.exports = {
  ROLE_KEYS,
  ROLE_LABELS,
  roleLabel,
  roleKey,
  sortChapelNames,
  getEventAttendanceBundle,
  statsForSession,
  emptySessionStats,
};
