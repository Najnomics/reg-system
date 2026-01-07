const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const reportsController = require('../controllers/reportsController');

const router = express.Router();

// All report routes require admin authentication
router.use(authenticateAdmin);

// Get analytics dashboard data
router.get('/analytics',
  validate(schemas.reportQuery, 'query'),
  reportsController.getAnalytics
);

// Get session-specific attendance report
router.get('/session/:sessionId',
  validate(schemas.sessionIdParam, 'params'),
  reportsController.getSessionReport
);

// Get member attendance history
router.get('/member/:memberId',
  validate(schemas.idParam, 'params'),
  validate(schemas.reportQuery, 'query'),
  reportsController.getMemberAttendance
);

// Get attendance trends and patterns
router.get('/trends',
  validate(schemas.reportQuery, 'query'),
  reportsController.getAttendanceTrends
);

// Export attendance data to Excel/CSV
router.get('/export',
  validate(schemas.reportQuery, 'query'),
  reportsController.exportAttendance
);

module.exports = router;