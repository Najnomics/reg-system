const { PrismaClient } = require('@prisma/client');

let prisma;

const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
};

// Use pooler URL (DATABASE_URL) for better connectivity
// DIRECT_URL is only needed for migrations, not runtime connections
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions);
} else {
  // In development, use a global variable to prevent multiple instances
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaOptions);
  }
  prisma = global.prisma;
}

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;