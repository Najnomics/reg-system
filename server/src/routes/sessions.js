const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// All session routes require admin authentication
router.use(authenticateAdmin);

// Get all sessions with filtering and pagination
router.get('/', 
  validate(schemas.reportQuery, 'query'), // Reuse report query schema for filtering
  sessionController.getSessions
);

// Get session statistics
router.get('/stats',
  sessionController.getSessionStats
);

// Create new session
router.post('/',
  validate(schemas.sessionCreate),
  sessionController.createSession
);

// Get single session by ID
router.get('/:id',
  validate(schemas.idParam, 'params'),
  sessionController.getSession
);

// Update session
router.patch('/:id',
  validate(schemas.idParam, 'params'),
  validate(schemas.sessionUpdate),
  sessionController.updateSession
);

// Delete session
router.delete('/:id',
  validate(schemas.idParam, 'params'),
  sessionController.deleteSession
);

// Download QR code for session
router.get('/:id/qr-code',
  validate(schemas.idParam, 'params'),
  sessionController.downloadQRCode
);

// Get printable QR code page
router.get('/:id/print',
  validate(schemas.idParam, 'params'),
  sessionController.getPrintableQR
);

module.exports = router;