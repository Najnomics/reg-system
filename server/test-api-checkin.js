const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPICheckin() {
  try {
    console.log('🌐 TESTING ACTUAL API CHECK-IN ENDPOINTS');
    console.log('='.repeat(60));

    const baseUrl = 'http://localhost:3000/api';
    
    // Get test data
    const testMember = await prisma.member.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, pin: true },
    });
    
    const testSession = await prisma.session.findFirst({
      where: { isActive: true },
      select: { id: true, theme: true, secretQuestion: true },
    });

    if (!testMember || !testSession) {
      console.log('❌ Missing test data (member or session)');
      return;
    }

    console.log(`👤 Test Member: ${testMember.name} (PIN: ${testMember.pin})`);
    console.log(`📅 Test Session: ${testSession.theme} (ID: ${testSession.id})`);
    console.log(`❓ Secret Question: ${testSession.secretQuestion}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 STEP 1: Validate Session');
    console.log('='.repeat(60));

    try {
      const validateResponse = await axios.get(`${baseUrl}/checkin/${testSession.id}/validate`);
      console.log('✅ Session validation successful');
      console.log(`   Valid: ${validateResponse.data.valid}`);
      console.log(`   Within time window: ${validateResponse.data.withinTimeWindow}`);
      console.log(`   Within buffer window: ${validateResponse.data.withinBufferWindow}`);
    } catch (error) {
      console.log('❌ Session validation failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 400) {
        console.log('   This might be due to time window restrictions');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 STEP 2: Verify Secret Answer');
    console.log('='.repeat(60));

    try {
      const answerResponse = await axios.post(`${baseUrl}/checkin/${testSession.id}/verify`, {
        answer: 'grace' // Common answer, might work
      });
      console.log('✅ Secret answer verification successful');
      console.log(`   Correct: ${answerResponse.data.correct}`);
    } catch (error) {
      console.log('❌ Secret answer verification failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log('   Note: This is expected if "grace" is not the correct answer');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 STEP 3: Submit Attendance (The Main Test)');
    console.log('='.repeat(60));

    try {
      const attendanceResponse = await axios.post(`${baseUrl}/checkin/${testSession.id}/submit`, {
        pin: testMember.pin
      });
      console.log('✅ Attendance submission successful');
      console.log(`   Success: ${attendanceResponse.data.success}`);
      console.log(`   Message: ${attendanceResponse.data.message}`);
      console.log(`   Member: ${attendanceResponse.data.data?.member?.name}`);
    } catch (error) {
      console.log('❌ Attendance submission failed');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log(`   Full error data:`, JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.error === 'Invalid PIN') {
        console.log('\n🔍 DETAILED PIN ANALYSIS:');
        console.log(`   Submitted PIN: "${testMember.pin}" (${typeof testMember.pin})`);
        console.log(`   PIN Length: ${testMember.pin.length}`);
        
        // Check if PIN exists in database
        const pinCheck = await prisma.member.findUnique({
          where: { pin: testMember.pin },
          select: { id: true, name: true, isActive: true },
        });
        console.log(`   PIN exists in DB: ${pinCheck ? 'YES' : 'NO'}`);
        if (pinCheck) {
          console.log(`   Member active: ${pinCheck.isActive}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 API CHECK-IN TEST COMPLETE');

  } catch (error) {
    console.error('❌ Error during API testing:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPICheckin();