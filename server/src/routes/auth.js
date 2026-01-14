const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = express.Router();

// Rate limiting for authentication endpoints - DISABLED
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     error: 'Too many authentication attempts',
//     message: 'Please try again later',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Validation schemas for password change
const changePasswordSchema = {
  currentPassword: require('joi').string().min(6).required(),
  newPassword: require('joi').string().min(6).required(),
  confirmPassword: require('joi').string().valid(require('joi').ref('newPassword')).required(),
};

// Authentication routes
router.post('/login', 
  validate(schemas.adminLogin),
  authController.login
);

router.post('/logout', 
  authController.logout
);

router.get('/verify', 
  authenticateUser,
  authController.verify
);

router.post('/refresh', 
  authenticateUser,
  authController.refresh
);

router.post('/change-password',
  authenticateUser,
  validate(require('joi').object(changePasswordSchema)),
  authController.changePassword
);

module.exports = router;