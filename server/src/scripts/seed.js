const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@church.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.admin.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        name: 'System Administrator',
        isActive: true,
      },
      create: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        isActive: true,
      },
    });

    console.log('✅ Admin user created/updated:', admin.email);

    // Create default system settings
    const defaultSettings = [
      { key: 'church_name', value: 'Your Church Name' },
      { key: 'church_address', value: 'Your Church Address' },
      { key: 'church_phone', value: '+1234567890' },
      { key: 'church_email', value: 'info@yourchurch.com' },
      { key: 'max_pin_attempts', value: '3' },
      { key: 'session_buffer_minutes', value: '15' },
      { key: 'pin_expiry_days', value: '365' },
    ];

    for (const setting of defaultSettings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    console.log('✅ System settings created/updated');

    // Create sample members (optional, for development)
    if (process.env.NODE_ENV === 'development') {
      const sampleMembers = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          pin: '12345',
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1987654321',
          pin: '54321',
        },
        {
          name: 'Bob Johnson',
          email: 'bob@example.com',
          phone: '+1555666777',
          pin: '11111',
        },
      ];

      for (const memberData of sampleMembers) {
        const pinHash = await bcrypt.hash(memberData.pin, 12);
        
        await prisma.member.upsert({
          where: { email: memberData.email },
          update: {
            name: memberData.name,
            phone: memberData.phone,
            pin: memberData.pin,
            pinHash,
            isActive: true,
          },
          create: {
            name: memberData.name,
            email: memberData.email,
            phone: memberData.phone,
            pin: memberData.pin,
            pinHash,
            isActive: true,
          },
        });
      }

      console.log('✅ Sample members created/updated');

      // Create a sample session (for development)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(12, 0, 0, 0);

      const secretAnswer = await bcrypt.hash('brown', 12);

      await prisma.session.upsert({
        where: { id: 1 },
        update: {
          theme: 'Sunday Morning Service',
          startTime: tomorrow,
          endTime: endTime,
          secretQuestion: 'What color is the altar cloth today?',
          secretAnswer,
          qrCodeData: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/1`,
          isActive: true,
        },
        create: {
          theme: 'Sunday Morning Service',
          startTime: tomorrow,
          endTime: endTime,
          secretQuestion: 'What color is the altar cloth today?',
          secretAnswer,
          qrCodeData: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkin/1`,
          isActive: true,
        },
      });

      console.log('✅ Sample session created/updated');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('📧 Admin credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('⚠️  Please change the admin password in production!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();