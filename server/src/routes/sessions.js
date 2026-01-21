const express = require('express');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Session read routes (accessible by admin and reg-rep)
router.get('/', 
  authenticateUser,
  validate(schemas.reportQuery, 'query'),
  sessionController.getSessions
);

router.get('/stats',
  authenticateUser,
  sessionController.getSessionStats
);

// Get chariot attendance overview for a session (admin only) - MUST be before /:id route
router.get('/:id/chariot-attendance',
  authenticateAdmin,
  validate(schemas.sessionId, 'params'),
  sessionController.getSessionChariotAttendance
);

router.get('/:id/attendance',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.getSessionAttendance
);

router.get('/:id/attendance/export/csv',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.exportSessionAttendanceCSV
);

router.get('/:id/attendance/export/pdf',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.exportSessionAttendancePDF
);

// Mark member as present (admin only)
router.post('/:id/attendance/mark-present',
  authenticateAdmin,
  validate(schemas.sessionId, 'params'),
  validate(schemas.markMemberPresent),
  sessionController.markMemberPresent
);

router.get('/:id/qr-code',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.downloadQRCode
);

router.get('/:id/print',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.getPrintableQR
);

router.get('/:id',
  authenticateUser,
  validate(schemas.sessionId, 'params'),
  sessionController.getSession
);

// Session management routes (admin only)
router.use(authenticateAdmin);

// Create new session
router.post('/',
  validate(schemas.sessionCreate),
  sessionController.createSession
);

// Update session
router.patch('/:id',
  validate(schemas.sessionId, 'params'),
  validate(schemas.sessionUpdate),
  sessionController.updateSession
);

// Delete session
router.delete('/:id',
  validate(schemas.sessionId, 'params'),
  sessionController.deleteSession
);

module.exports = router;