const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const regRepController = require('../controllers/regRepController');

const router = express.Router();

// All reg-rep management routes require admin authentication
router.use(authenticateAdmin);

// Get all reg-reps with pagination and search (admin only)
router.get('/', 
  validate(schemas.searchQuery, 'query'),
  regRepController.getRegReps
);

// Create new reg-rep (admin only)
router.post('/',
  validate(schemas.regRepCreate),
  regRepController.createRegRep
);

// Get single reg-rep by ID (admin only)
router.get('/:id',
  validate(schemas.regRepId, 'params'),
  regRepController.getRegRep
);

// Update reg-rep (admin only)
router.patch('/:id',
  validate(schemas.regRepId, 'params'),
  validate(schemas.regRepUpdate),
  regRepController.updateRegRep
);

// Delete/deactivate reg-rep (admin only)
router.delete('/:id',
  validate(schemas.regRepId, 'params'),
  regRepController.deleteRegRep
);

// Toggle reg-rep status (active/inactive) (admin only)
router.patch('/:id/toggle-status',
  validate(schemas.regRepId, 'params'),
  regRepController.toggleRegRepStatus
);

// Reset reg-rep password (admin only)
router.post('/:id/reset-password',
  validate(schemas.regRepId, 'params'),
  validate(schemas.passwordReset),
  regRepController.resetRegRepPassword
);

module.exports = router;