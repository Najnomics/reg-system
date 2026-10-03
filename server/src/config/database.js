const { PrismaClient } = require('@prisma/client');

let prisma;

// When a whole room scans a session QR code at once, requests queue for a
// database connection. Prisma's default 10s wait turns that queue into errors,
// so wait longer unless the URL sets its own pool_timeout.
const withPoolTimeout = (rawUrl) => {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '30');
    return url.toString();
  } catch {
    return rawUrl;
  }
};

const prismaOptions = {
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: { db: { url: withPoolTimeout(process.env.DATABASE_URL) } },
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