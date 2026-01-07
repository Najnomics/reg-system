const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

/**
 * Generate a unique 5-digit PIN for a member
 */
const generateUniquePin = async () => {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random 5-digit PIN
    const pin = Math.floor(10000 + Math.random() * 90000).toString();

    // Check if PIN already exists
    const existingMember = await prisma.member.findUnique({
      where: { pin },
      select: { id: true },
    });

    if (!existingMember) {
      return pin;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique PIN after maximum attempts');
};

/**
 * Hash a PIN for secure storage
 */
const hashPin = async (pin) => {
  return await bcrypt.hash(pin, 12);
};

/**
 * Verify a PIN against its hash
 */
const verifyPin = async (pin, hash) => {
  return await bcrypt.compare(pin, hash);
};

/**
 * Generate PIN and hash for a new member
 */
const generateMemberPin = async () => {
  const pin = await generateUniquePin();
  const pinHash = await hashPin(pin);
  
  return { pin, pinHash };
};

module.exports = {
  generateUniquePin,
  hashPin,
  verifyPin,
  generateMemberPin,
};