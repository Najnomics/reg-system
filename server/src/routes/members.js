const express = require('express');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const memberController = require('../controllers/memberController');

const router = express.Router();

// Member read routes (accessible by admin and reg-rep)
router.get('/', 
  authenticateUser,
  validate(schemas.searchQuery, 'query'),
  memberController.getMembers
);

router.get('/search',
  authenticateUser,
  validate(schemas.searchQuery, 'query'),
  memberController.searchMembers
);

// Template download route must come before /:id to avoid route conflict
// Admin only since bulk upload is admin-only
router.get('/template', (req, res, next) => {
  console.log('Template route matched:', req.path, req.query);
  next();
}, authenticateAdmin, require('../controllers/uploadController').downloadTemplate);

// Export members CSV (admin and reg-rep)
router.get('/export/csv',
  authenticateUser,
  memberController.exportMembersCSV
);

router.get('/:id',
  authenticateUser,
  validate(schemas.memberId, 'params'),
  memberController.getMember
);

// Resend PIN email to member (accessible by admin and reg-rep)
router.post('/:id/resend-pin',
  authenticateUser,
  validate(schemas.memberId, 'params'),
  memberController.resendPin
);

// Member management routes (admin only)
router.use(authenticateAdmin);

// Create new member
router.post('/',
  validate(schemas.memberCreate),
  memberController.createMember
);

// Upload members via Excel/CSV file
router.post('/upload',
  require('../middleware/upload').uploadMiddleware,
  require('../controllers/uploadController').uploadMembers
);

// Sort-upload CSV (admin only)
router.post(
  '/sort-upload',
  require('../middleware/upload').uploadMiddleware,
  require('../controllers/uploadController').sortUploadMembers
);

// Get upload history
router.get('/upload-history',
  require('../controllers/uploadController').getUploadHistory
);

// Update member
router.patch('/:id',
  validate(schemas.memberId, 'params'),
  validate(schemas.memberUpdate),
  memberController.updateMember
);

// Bulk delete/deactivate members
router.post('/bulk-delete',
  memberController.bulkDeleteMembers
);

// Delete/deactivate member
router.delete('/:id',
  validate(schemas.memberId, 'params'),
  memberController.deleteMember
);

// Toggle member status (active/inactive)
router.patch('/:id/toggle-status',
  validate(schemas.memberId, 'params'),
  memberController.toggleMemberStatus
);

// Bulk resend PIN emails (admin only)
router.post('/bulk-resend-pin',
  memberController.bulkResendPin
);

// Resend PIN emails to all active members (admin only)
router.post('/resend-pin-all',
  memberController.resendPinToAll
);

module.exports = router;