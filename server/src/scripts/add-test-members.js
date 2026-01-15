const { PrismaClient } = require('@prisma/client');
const { generateMemberPin } = require('../utils/pinGenerator');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Adding 15 test members...');

    // Get the first admin user to use as createdBy
    const admin = await prisma.admin.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
    });

    if (!admin) {
      console.error('❌ No active admin found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`✅ Using admin: ${admin.email}`);

    // Generate 15 test members with realistic but clearly test data
    const testMembers = [
      { name: 'Test Member One', email: 'test.member.01@test.com', phone: '+12345678901' },
      { name: 'Test Member Two', email: 'test.member.02@test.com', phone: '+12345678902' },
      { name: 'Test Member Three', email: 'test.member.03@test.com', phone: '+12345678903' },
      { name: 'Test Member Four', email: 'test.member.04@test.com', phone: '+12345678904' },
      { name: 'Test Member Five', email: 'test.member.05@test.com', phone: '+12345678905' },
      { name: 'Test Member Six', email: 'test.member.06@test.com', phone: '+12345678906' },
      { name: 'Test Member Seven', email: 'test.member.07@test.com', phone: '+12345678907' },
      { name: 'Test Member Eight', email: 'test.member.08@test.com', phone: '+12345678908' },
      { name: 'Test Member Nine', email: 'test.member.09@test.com', phone: '+12345678909' },
      { name: 'Test Member Ten', email: 'test.member.10@test.com', phone: '+12345678910' },
      { name: 'Test Member Eleven', email: 'test.member.11@test.com', phone: '+12345678911' },
      { name: 'Test Member Twelve', email: 'test.member.12@test.com', phone: '+12345678912' },
      { name: 'Test Member Thirteen', email: 'test.member.13@test.com', phone: '+12345678913' },
      { name: 'Test Member Fourteen', email: 'test.member.14@test.com', phone: '+12345678914' },
      { name: 'Test Member Fifteen', email: 'test.member.15@test.com', phone: '+12345678915' },
    ];

    const createdMembers = [];
    const errors = [];

    for (const memberData of testMembers) {
      try {
        // Check if member already exists
        const existing = await prisma.member.findUnique({
          where: { email: memberData.email.toLowerCase() },
        });

        if (existing) {
          console.log(`⏭️  Skipping ${memberData.name} - already exists`);
          continue;
        }

        // Generate PIN and hash
        const { pin, pinHash } = await generateMemberPin();

        // Generate UUID for member ID
        const { randomUUID } = require('crypto');
        const memberId = randomUUID();

        // Create member
        const member = await prisma.member.create({
          data: {
            id: memberId,
            name: memberData.name,
            email: memberData.email.toLowerCase(),
            phone: memberData.phone,
            pin,
            pinHash,
            isActive: true,
            createdBy: admin.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
          },
        });

        createdMembers.push(member);
        console.log(`✅ Created: ${member.name} (${member.email}) - PIN: ${member.pin}`);
      } catch (error) {
        errors.push({ member: memberData.name, error: error.message });
        console.error(`❌ Failed to create ${memberData.name}:`, error.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${createdMembers.length} members`);
    console.log(`❌ Errors: ${errors.length}`);

    if (createdMembers.length > 0) {
      console.log('\n📝 Created Members:');
      createdMembers.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.name} - Email: ${member.email} - PIN: ${member.pin}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.member}: ${err.error}`);
      });
    }

    console.log('\n🎉 Test members creation completed!');
    console.log('💡 You can delete these members later from the admin panel.');

  } catch (error) {
    console.error('❌ Error adding test members:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
