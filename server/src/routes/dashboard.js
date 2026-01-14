const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// All dashboard routes accessible by admin and reg-rep
router.use(authenticateUser);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;