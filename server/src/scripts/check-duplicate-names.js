const prisma = require('../config/database');

async function checkDuplicateNames() {
  try {
    console.log('Checking for duplicate names...\n');
    
    // Get all members
    const allMembers = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Group by name (case-insensitive)
    const nameGroups = {};
    allMembers.forEach(member => {
      const normalizedName = member.name.trim().toLowerCase();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(member);
    });

    // Find duplicates
    const duplicates = Object.entries(nameGroups)
      .filter(([name, members]) => members.length > 1)
      .map(([name, members]) => ({ name, members }));

    if (duplicates.length === 0) {
      console.log('✅ No duplicate names found!');
      console.log('You can safely apply the unique constraint.');
      return;
    }

    console.log(`⚠️  Found ${duplicates.length} duplicate name(s):\n`);
    
    duplicates.forEach(({ name, members }) => {
      console.log(`Name: "${members[0].name}" (${members.length} occurrences)`);
      members.forEach((member, index) => {
        console.log(`  ${index + 1}. ID: ${member.id}`);
        console.log(`     Email: ${member.email}`);
        console.log(`     Created: ${member.createdAt.toISOString()}`);
      });
      console.log('');
    });

    console.log('\n⚠️  You need to resolve these duplicates before applying the unique constraint.');
    console.log('Options:');
    console.log('1. Update duplicate names to make them unique (e.g., add a suffix)');
    console.log('2. Delete duplicate members if they are truly duplicates');
    console.log('3. Merge duplicate members if they represent the same person');

  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateNames();
