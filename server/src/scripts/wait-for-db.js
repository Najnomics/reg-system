/**
 * Wait for database connection to be ready before running migrations
 * This prevents migration failures during Railway deployments
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error'],
});

const MAX_RETRIES = 30; // Maximum number of retry attempts
const RETRY_DELAY = 2000; // Delay between retries in milliseconds (2 seconds)

async function waitForDatabase() {
  console.log('⏳ Waiting for database connection...');
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Try to connect to the database
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection established!');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`❌ Failed to connect to database after ${MAX_RETRIES} attempts`);
        console.error('Error:', error.message);
        await prisma.$disconnect();
        return false;
      }
      
      console.log(`⏳ Attempt ${attempt}/${MAX_RETRIES}: Database not ready, retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  await prisma.$disconnect();
  return false;
}

// Run if called directly
if (require.main === module) {
  waitForDatabase()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { waitForDatabase };
