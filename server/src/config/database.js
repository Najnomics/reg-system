const { PrismaClient } = require('@prisma/client');

let prisma;

const prismaOptions = {
  log: ['warn', 'error'],
  // Optimize connection pooling
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

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