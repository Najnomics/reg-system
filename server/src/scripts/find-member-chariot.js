require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

// Use DIRECT_URL if available for scripts
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
});

const normalizeName = (value) =>
  String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

const main = async () => {
  const searchName = process.argv[2] || 'treasure ogieuhi';
  const normalizedSearch = normalizeName(searchName);

  console.log(`🔍 Searching for member: "${searchName}"...\n`);

  // Find member by name (case-insensitive)
  const member = await prisma.member.findFirst({
    where: {
      name: {
        contains: searchName,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      pin: true,
      chapelRole: true,
      chapel: {
        select: {
          id: true,
          name: true,
        },
      },
      chariotLeader: {
        select: {
          id: true,
          name: true,
        },
      },
      chariotAssistants: {
        select: {
          chariot: {
            select: {
              id: true,
              name: true,
              leader: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      chariotMembers: {
        select: {
          chariot: {
            select: {
              id: true,
              name: true,
              leader: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!member) {
    console.log(`❌ Member not found: "${searchName}"`);
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('📋 MEMBER DETAILS');
  console.log('='.repeat(80));
  console.log(`Name: ${member.name}`);
  console.log(`Email: ${member.email}`);
  console.log(`PIN: ${member.pin}`);
  console.log(`Role: ${member.chapelRole || 'Not assigned'}`);
  if (member.chapel) {
    console.log(`Chapel: ${member.chapel.name}`);
  } else {
    console.log(`Chapel: Not assigned`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🚗 CHARIOT ASSIGNMENT');
  console.log('='.repeat(80));

  if (member.chariotLeader && member.chariotLeader.length > 0) {
    const chariot = member.chariotLeader[0];
    console.log(`✅ Chariot: ${chariot.name}`);
    console.log(`   Role: Leader`);
    console.log(`   Member ID: ${member.id}`);
  } else if (member.chariotAssistants && member.chariotAssistants.length > 0) {
    const chariot = member.chariotAssistants[0].chariot;
    console.log(`✅ Chariot: ${chariot.name}`);
    console.log(`   Role: Assistant`);
    if (chariot.leader) {
      console.log(`   Leader: ${chariot.leader.name} (${chariot.leader.email})`);
    }
  } else if (member.chariotMembers && member.chariotMembers.length > 0) {
    const chariot = member.chariotMembers[0].chariot;
    console.log(`✅ Chariot: ${chariot.name}`);
    console.log(`   Role: Member`);
    if (chariot.leader) {
      console.log(`   Leader: ${chariot.leader.name} (${chariot.leader.email})`);
    }
  } else {
    console.log(`❌ Not assigned to any chariot`);
  }

  console.log('='.repeat(80));
};

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  });
