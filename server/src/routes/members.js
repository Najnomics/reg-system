const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const memberController = require('../controllers/memberController');

const router = express.Router();

// All member routes require admin authentication
router.use(authenticateAdmin);

// Get all members with pagination and search
router.get('/', 
  validate(schemas.searchQuery, 'query'),
  memberController.getMembers
);

// Search members with advanced filters
router.get('/search',
  validate(schemas.searchQuery, 'query'),
  memberController.searchMembers
);

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

// Get single member by ID
router.get('/:id',
  validate(schemas.idParam, 'params'),
  memberController.getMember
);

// Update member
router.patch('/:id',
  validate(schemas.idParam, 'params'),
  validate(schemas.memberUpdate),
  memberController.updateMember
);

// Delete/deactivate member
router.delete('/:id',
  validate(schemas.idParam, 'params'),
  memberController.deleteMember
);

// Resend PIN email to member
router.post('/:id/resend-pin',
  validate(schemas.idParam, 'params'),
  memberController.resendPin
);

module.exports = router;