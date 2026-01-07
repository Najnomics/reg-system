const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const checkinController = require('../controllers/checkinController');

const router = express.Router();

// Rate limiting for check-in endpoints
const checkinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 check-in attempts per window
  message: {
    error: 'Too many check-in attempts',
    message: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// PIN submission rate limiting (stricter)
const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 PIN attempts per session
  message: {
    error: 'Too many PIN attempts',
    message: 'Please wait before trying again',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no authentication required)

// Get session information for check-in (public)
router.get('/:sessionId/info',
  validate(schemas.sessionIdParam, 'params'),
  checkinController.getSessionInfo
);

// Validate session for check-in (public)
router.get('/:sessionId/validate',
  checkinLimiter,
  validate(schemas.sessionIdParam, 'params'),
  checkinController.validateSession
);

// Verify secret question answer (public)
router.post('/:sessionId/verify',
  checkinLimiter,
  validate(schemas.sessionIdParam, 'params'),
  validate(schemas.checkinAnswer),
  checkinController.verifySecretAnswer
);

// Submit attendance with PIN (public)
router.post('/:sessionId/submit',
  pinLimiter,
  validate(schemas.sessionIdParam, 'params'),
  validate(schemas.checkinSubmit),
  checkinController.submitAttendance
);

// Admin routes (authentication required)

// Get check-in statistics for a session (admin only)
router.get('/:sessionId/stats',
  authenticateAdmin,
  validate(schemas.sessionIdParam, 'params'),
  checkinController.getCheckInStats
);

module.exports = router;