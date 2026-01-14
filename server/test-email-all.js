const { PrismaClient } = require('@prisma/client');
const emailService = require('./src/services/emailService');

const prisma = new PrismaClient();

async function testEmailToAllMembers() {
  try {
    console.log('📧 TESTING EMAIL SENDING TO ALL CURRENT MEMBERS');
    console.log('='.repeat(60));

    // Get all active members
    const members = await prisma.member.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Found ${members.length} active members to send emails to:\n`);

    if (members.length === 0) {
      console.log('❌ No active members found. Cannot test email sending.');
      return;
    }

    // Display members that will receive emails
    members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} (${member.email}) - PIN: ${member.pin}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🚀 Starting email sending process...\n');

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Send emails to all members
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      console.log(`📤 [${i + 1}/${members.length}] Sending to ${member.name} (${member.email})...`);
      
      try {
        await emailService.sendPin(member);
        console.log(`   ✅ SUCCESS - Email sent to ${member.name}`);
        successCount++;
        results.push({ member: member.name, email: member.email, status: 'SUCCESS' });
      } catch (error) {
        console.log(`   ❌ FAILED - Error sending to ${member.name}: ${error.message}`);
        failureCount++;
        results.push({ member: member.name, email: member.email, status: 'FAILED', error: error.message });
      }
      
      // Add small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 EMAIL SENDING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successful emails: ${successCount}`);
    console.log(`❌ Failed emails: ${failureCount}`);
    console.log(`📊 Total attempted: ${members.length}`);
    
    if (failureCount > 0) {
      console.log('\n❌ FAILED EMAILS:');
      results.filter(r => r.status === 'FAILED').forEach(result => {
        console.log(`   ${result.member} (${result.email}): ${result.error}`);
      });
    }

    if (successCount > 0) {
      console.log('\n✅ SUCCESSFUL EMAILS:');
      results.filter(r => r.status === 'SUCCESS').forEach(result => {
        console.log(`   ${result.member} (${result.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during email testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailToAllMembers();