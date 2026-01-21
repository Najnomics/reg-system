const { PrismaClient } = require('@prisma/client');

let prisma;

const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
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