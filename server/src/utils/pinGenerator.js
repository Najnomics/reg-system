const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

/**
 * Generate a 4-digit PIN that is unique within the given event
 */
const generateUniquePin = async (eventId) => {
  if (!eventId) {
    throw new Error('eventId is required to generate a member PIN');
  }

  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    // Generate random 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if PIN already exists in this event
    const existingMember = await prisma.member.findFirst({
      where: { eventId, pin },
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
const generateMemberPin = async (eventId) => {
  const pin = await generateUniquePin(eventId);
  const pinHash = await hashPin(pin);
  
  return { pin, pinHash };
};

module.exports = {
  generateUniquePin,
  hashPin,
  verifyPin,
  generateMemberPin,
};