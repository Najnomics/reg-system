const prisma = require('../config/database');

async function resolveDuplicateNames() {
  try {
    console.log('Resolving duplicate names...\n');
    
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
      return;
    }

    console.log(`Found ${duplicates.length} duplicate name(s). Resolving...\n`);
    
    // Resolve each duplicate by adding a suffix to all but the first occurrence
    for (const { name, members } of duplicates) {
      console.log(`Processing: "${members[0].name}" (${members.length} occurrences)`);
      
      // Keep the first one as-is, update the rest
      for (let i = 1; i < members.length; i++) {
        const member = members[i];
        const newName = `${member.name} (${i})`;
        
        console.log(`  Updating member ${member.id}:`);
        console.log(`    Old name: "${member.name}"`);
        console.log(`    New name: "${newName}"`);
        
        await prisma.member.update({
          where: { id: member.id },
          data: { name: newName },
        });
        
        console.log(`    ✅ Updated\n`);
      }
    }

    console.log('✅ All duplicates resolved!');
    console.log('\nYou can now apply the unique constraint migration.');

  } catch (error) {
    console.error('Error resolving duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resolveDuplicateNames();
