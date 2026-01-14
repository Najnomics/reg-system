const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getCurrentPins() {
  try {
    const members = await prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        pin: true,
        pinHash: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('🔍 CURRENT ACTIVE MEMBERS AND THEIR PINS:');
    console.log('='.repeat(60));
    members.forEach((member, index) => {
      console.log(`${index + 1}. Name: ${member.name}`);
      console.log(`   ID: ${member.id}`);
      console.log(`   PIN: ${member.pin} (${member.pin.length} digits)`);
      console.log(`   PIN Hash: ${member.pinHash ? 'EXISTS' : 'MISSING'}`);
      console.log(`   Created: ${member.createdAt}`);
      console.log('   ' + '-'.repeat(50));
    });
    console.log('='.repeat(60));
    console.log(`📊 Total active members: ${members.length}`);
    
    const fourDigitCount = members.filter(m => m.pin.length === 4).length;
    const fiveDigitCount = members.filter(m => m.pin.length === 5).length;
    
    console.log(`✅ 4-digit PINs: ${fourDigitCount}`);
    console.log(`⚠️  5-digit PINs: ${fiveDigitCount}`);
    
  } catch (error) {
    console.error('Error checking current PINs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getCurrentPins();