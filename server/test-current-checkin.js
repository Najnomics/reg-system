const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCurrentCheckin() {
  try {
    console.log('🔥 TESTING CURRENT 4-DIGIT PIN CHECK-IN');
    console.log('='.repeat(60));

    const baseUrl = 'http://localhost:3000/api';

    // Get current active sessions
    const activeSessions = await prisma.session.findMany({
      where: { isActive: true },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'desc' },
    });

    console.log(`📅 Found ${activeSessions.length} active sessions:`);
    activeSessions.forEach((session, i) => {
      console.log(`   ${i + 1}. ${session.theme} (ID: ${session.id})`);
      console.log(`      ${new Date(session.startTime).toLocaleString()} - ${new Date(session.endTime).toLocaleString()}`);
    });

    if (activeSessions.length === 0) {
      console.log('❌ No active sessions found');
      return;
    }

    // Use the most recent session
    const testSession = activeSessions[0];
    console.log(`\n🎯 Testing with session: ${testSession.theme} (ID: ${testSession.id})`);

    // Test with each member PIN
    const testMembers = [
      { name: 'Nosakhare Jesuorobo', pin: '9557' },
      { name: 'Jesuorobo nosakhare', pin: '7843' }, 
      { name: 'john broad', pin: '6967' }
    ];

    for (const member of testMembers) {
      console.log(`\n👤 Testing PIN ${member.pin} for ${member.name}:`);
      
      try {
        const response = await axios.post(`${baseUrl}/checkin/${testSession.id}/submit`, {
          pin: member.pin
        });
        
        console.log(`   ✅ SUCCESS: ${response.data.message}`);
        console.log(`   Check-in time: ${response.data.data?.attendance?.checkedInAt}`);
      } catch (error) {
        console.log(`   ❌ FAILED: ${error.response?.data?.message || error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Error type: ${error.response?.data?.error}`);
        
        if (error.response?.data?.details) {
          console.log(`   Details:`, JSON.stringify(error.response.data.details, null, 4));
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 TEST COMPLETE');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testCurrentCheckin();