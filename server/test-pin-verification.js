const { PrismaClient } = require('@prisma/client');
const { verifyPin, hashPin } = require('./src/utils/pinGenerator');

const prisma = new PrismaClient();

async function testPinVerification() {
  try {
    console.log('🔍 TESTING PIN VERIFICATION');
    console.log('='.repeat(60));

    // Get all active members
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

    console.log(`📊 Found ${members.length} active members to test:\n`);

    for (const member of members) {
      console.log(`👤 Testing: ${member.name} (ID: ${member.id})`);
      console.log(`   Current PIN: ${member.pin}`);
      console.log(`   Has PIN Hash: ${member.pinHash ? 'YES' : 'NO'}`);
      
      if (member.pinHash) {
        try {
          const isValid = await verifyPin(member.pin, member.pinHash);
          console.log(`   ✅ PIN Verification: ${isValid ? 'VALID' : '❌ INVALID'}`);
          
          if (!isValid) {
            // Try to see if the hash was for a 5-digit version
            const pin5Digit = member.pin.length === 4 ? '1' + member.pin : member.pin;
            const isValid5Digit = await verifyPin(pin5Digit, member.pinHash);
            console.log(`   🔍 Testing 5-digit variant (${pin5Digit}): ${isValid5Digit ? 'VALID' : 'INVALID'}`);
          }
        } catch (error) {
          console.log(`   ❌ Error verifying PIN: ${error.message}`);
        }
      }
      
      console.log('   ' + '-'.repeat(50));
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 DIAGNOSIS COMPLETE');
    
    // Check if any members have invalid PIN hashes
    const invalidMembers = [];
    for (const member of members) {
      if (member.pinHash) {
        try {
          const isValid = await verifyPin(member.pin, member.pinHash);
          if (!isValid) {
            invalidMembers.push(member);
          }
        } catch (error) {
          invalidMembers.push(member);
        }
      }
    }
    
    if (invalidMembers.length > 0) {
      console.log(`\n⚠️  Found ${invalidMembers.length} members with invalid PIN hashes that need fixing:`);
      invalidMembers.forEach(member => {
        console.log(`   - ${member.name} (PIN: ${member.pin})`);
      });
    } else {
      console.log('\n✅ All members have valid PIN hashes!');
    }

  } catch (error) {
    console.error('❌ Error during PIN verification testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPinVerification();