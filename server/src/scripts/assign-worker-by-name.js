require('dotenv').config();

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = require('../config/database');

const normalize = (value) =>
  String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const main = async () => {
  const nameArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  const fullName = nameArg || 'Udorgwu Bartholomew';
  const normalizedName = normalize(fullName);

  if (!normalizedName) {
    console.error('Please provide a member name.');
    return;
  }

  const member = await prisma.member.findFirst({
    where: { name: { equals: fullName, mode: 'insensitive' }, isActive: { not: false } },
    select: { id: true, name: true, email: true, chapelRole: true },
  });

  if (!member) {
    console.log(`Member not found: ${fullName}`);
    return;
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { chapelRole: 'WORKER' },
  });

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

  if (chariots.length === 0) {
    console.log('No active chariots found. Worker role updated only.');
    return;
  }

  const occupied = new Set();
  chariots.forEach((chariot) => {
    if (chariot.leaderId) occupied.add(chariot.leaderId);
    chariot.assistants.forEach((assistant) => occupied.add(assistant.memberId));
  });

  if (occupied.has(member.id)) {
    console.log(
      `${member.name} is a leader/assistant; worker role updated, chariot assignment skipped.`
    );
    return;
  }

  const chariotCounts = chariots
    .map((chariot) => ({
      id: chariot.id,
      name: chariot.name,
      count: chariot.members.length,
    }))
    .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));

  const target = chariotCounts[0];

  await prisma.$transaction(async (tx) => {
    await tx.chariotMember.deleteMany({ where: { memberId: member.id } });
    await tx.chariotMember.create({
      data: { memberId: member.id, chariotId: target.id },
    });
  });

  console.log(`${member.name} set to WORKER and assigned to ${target.name}.`);
};

main()
  .catch((error) => {
    console.error('Failed to assign worker:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
