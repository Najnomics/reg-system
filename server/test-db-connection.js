require('dotenv').config();
const prisma = require('./src/config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
    console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Set' : 'Missing');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');
    
    // Test Prisma connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const adminCount = await prisma.admin.count();
    console.log(`✅ Found ${adminCount} admin(s) in database`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  }
}

testConnection();
