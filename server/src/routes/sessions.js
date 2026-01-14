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

router.get('/:id',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.getSession
);

router.get('/:id/attendance',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.getSessionAttendance
);

router.get('/:id/attendance/export/csv',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.exportSessionAttendanceCSV
);

router.get('/:id/attendance/export/pdf',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.exportSessionAttendancePDF
);

router.get('/:id/qr-code',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.downloadQRCode
);

router.get('/:id/print',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  sessionController.getPrintableQR
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
  validate(schemas.idParam, 'params'),
  validate(schemas.sessionUpdate),
  sessionController.updateSession
);

// Delete session
router.delete('/:id',
  validate(schemas.idParam, 'params'),
  sessionController.deleteSession
);

module.exports = router;