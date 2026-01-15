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

router.get('/:id',
  authenticateUser,
  validate(schemas.idParam, 'params'),
  memberController.getMember
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

// Download Excel template
router.get('/template',
  require('../controllers/uploadController').downloadTemplate
);

// Get upload history
router.get('/upload-history',
  require('../controllers/uploadController').getUploadHistory
);

// Update member
router.patch('/:id',
  validate(schemas.idParam, 'params'),
  validate(schemas.memberUpdate),
  memberController.updateMember
);

// Bulk delete/deactivate members
router.post('/bulk-delete',
  memberController.bulkDeleteMembers
);

// Delete/deactivate member
router.delete('/:id',
  validate(schemas.idParam, 'params'),
  memberController.deleteMember
);

// Toggle member status (active/inactive)
router.patch('/:id/toggle-status',
  validate(schemas.idParam, 'params'),
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

// Resend PIN email to member
router.post('/:id/resend-pin',
  validate(schemas.idParam, 'params'),
  memberController.resendPin
);

module.exports = router;