const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCheckinFlow() {
  try {
    console.log('🔍 TESTING FULL CHECK-IN FLOW');
    console.log('='.repeat(60));

    // 1. Check active sessions
    const activeSessions = await prisma.session.findMany({
      where: { isActive: true },
      select: {
        id: true,
        theme: true,
        startTime: true,
        endTime: true,
        isActive: true,
        secretQuestion: true,
        secretAnswer: true,
      },
      orderBy: { startTime: 'desc' },
    });

    console.log(`📊 Found ${activeSessions.length} active sessions:`);
    
    if (activeSessions.length === 0) {
      console.log('❌ No active sessions found. Creating a test session...');
      
      // Create a test session
      const now = new Date();
      const startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
      const endTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now
      
      const bcrypt = require('bcryptjs');
      const secretAnswer = await bcrypt.hash('grace', 12);
      
      const testSession = await prisma.session.create({
        data: {
          theme: 'Test Sunday Service',
          startTime,
          endTime,
          secretQuestion: 'What is the name of our church?',
          secretAnswer,
          isActive: true,
        },
      });
      
      console.log(`✅ Created test session: "${testSession.theme}" (ID: ${testSession.id})`);
      activeSessions.push(testSession);
    }
    
    activeSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.theme} (ID: ${session.id})`);
      console.log(`      Start: ${session.startTime}`);
      console.log(`      End: ${session.endTime}`);
      console.log(`      Question: ${session.secretQuestion}`);
    });

    // 2. Get test member
    const testMember = await prisma.member.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        pin: true,
        pinHash: true,
      },
    });

    if (!testMember) {
      console.log('❌ No active members found for testing');
      return;
    }

    console.log(`\n👤 Using test member: ${testMember.name} (PIN: ${testMember.pin})`);

    // 3. Test the check-in flow for the first session
    const testSession = activeSessions[0];
    console.log(`\n🎯 Testing check-in for session: ${testSession.theme}`);
    console.log('='.repeat(60));

    // Step 1: Find member by PIN (mimicking submitAttendance logic)
    console.log(`📤 Step 1: Finding member by PIN "${testMember.pin}"...`);
    
    const foundMember = await prisma.member.findUnique({
      where: { pin: testMember.pin },
      select: {
        id: true,
        name: true,
        email: true,
        pinHash: true,
        isActive: true,
      },
    });

    if (!foundMember) {
      console.log(`❌ PROBLEM: Member not found by PIN "${testMember.pin}"`);
    } else {
      console.log(`✅ Member found: ${foundMember.name}`);
      
      // Step 2: Verify PIN hash
      console.log(`📤 Step 2: Verifying PIN hash...`);
      const { verifyPin } = require('./src/utils/pinGenerator');
      
      const isPinValid = await verifyPin(testMember.pin, foundMember.pinHash);
      console.log(`✅ PIN Hash Verification: ${isPinValid ? 'VALID' : '❌ INVALID'}`);
      
      // Step 3: Check for existing attendance
      console.log(`📤 Step 3: Checking for existing attendance...`);
      
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          sessionId_memberId: {
            sessionId: testSession.id,
            memberId: foundMember.id,
          },
        },
      });
      
      if (existingAttendance) {
        console.log(`⚠️  Member already checked in at: ${existingAttendance.checkedInAt}`);
      } else {
        console.log(`✅ No existing attendance - ready to check in`);
        
        // Step 4: Create attendance record (simulation)
        console.log(`📤 Step 4: Simulating attendance record creation...`);
        console.log(`✅ Would create attendance for member ${foundMember.id} in session ${testSession.id}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('💡 CHECK-IN FLOW TEST COMPLETE');
    
  } catch (error) {
    console.error('❌ Error during check-in flow testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCheckinFlow();