const prisma = require('../config/database');
const crypto = require('crypto');

const chapelNames = [
  'Truth',
  'Power',
  'Faith',
  'Light',
  'Grace',
  'Missions and Glory',
  'Revelations',
  'Fire',
  'Spirit',
  'Gospel',
  'Provost',
  'Pst-Charles',
];

const seedChapels = async () => {
  const admin = await prisma.admin.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!admin) {
    throw new Error('No admin found. Create an admin first, then re-run this script.');
  }

  let created = 0;
  let skipped = 0;

  for (const name of chapelNames) {
    const trimmedName = name.trim();
    const existing = await prisma.chapel.findFirst({
      where: { name: trimmedName },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.chapel.create({
      data: {
        id: crypto.randomUUID(),
        name: trimmedName,
        description: null,
        createdBy: admin.id,
      },
    });

    created += 1;
  }

  return { created, skipped };
};

seedChapels()
  .then(({ created, skipped }) => {
    console.log(`Chapels created: ${created}, skipped: ${skipped}`);
  })
  .catch((error) => {
    console.error('Failed to seed chapels:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
