const express = require('express');
const { authenticateChariotUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const chariotUserController = require('../controllers/chariotUserController');

const router = express.Router();

// All routes require chariot leader or assistant authentication
router.use(authenticateChariotUser);

// Get chariot members
router.get('/members', chariotUserController.getChariotMembers);

// Get chariot sessions
router.get('/sessions', chariotUserController.getChariotSessions);

// Get a single session
router.get('/sessions/:id', validate(schemas.uuidParam, 'params'), chariotUserController.getChariotSession);

// Get dashboard stats
router.get('/dashboard/stats', chariotUserController.getChariotDashboardStats);

module.exports = router;
