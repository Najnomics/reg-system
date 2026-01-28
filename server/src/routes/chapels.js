const express = require('express');
const Joi = require('joi');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const chapelController = require('../controllers/chapelController');

const router = express.Router();

const allowChapelRead = (req, res, next) => {
  const allowedRoles = ['admin', 'pastoral'];
  if (req.user?.userType === 'reg-rep') {
    if (!req.user.canAssignChapels) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access chapel data',
      });
    }
    return next();
  }

  if (!req.user || !allowedRoles.includes(req.user.userType)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access chapel data',
    });
  }
  next();
};

const allowChapelAssign = (req, res, next) => {
  if (req.user?.userType === 'admin') return next();
  if (req.user?.userType === 'reg-rep' && req.user.canAssignChapels) return next();
  return res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have permission to assign chapel members',
  });
};

// Get all chapels
router.get('/', authenticateUser, allowChapelRead, chapelController.getChapels);

// Export all chapels as PDF
router.get('/export/pdf', authenticateUser, allowChapelRead, chapelController.exportChapelsPDF);

// Get a single chapel
router.get('/:id', authenticateUser, allowChapelRead, validate(schemas.uuidParam, 'params'), chapelController.getChapel);

// Add members to chapel (admin or allowed reg-rep)
router.post(
  '/:id/members',
  authenticateUser,
  allowChapelAssign,
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
    role: Joi.string().valid('INVITEE', 'MEMBER', 'CHAPEL_LEADER').optional().messages({
      'any.only': 'role must be INVITEE, MEMBER, or CHAPEL_LEADER',
    }),
  })),
  chapelController.addMembers
);

// Remove members from chapel (admin or allowed reg-rep)
router.delete(
  '/:id/members',
  authenticateUser,
  allowChapelAssign,
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
  })),
  chapelController.removeMembers
);

// Write routes require admin authentication
router.use(authenticateAdmin);

// Create a new chapel
router.post(
  '/',
  validate(Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Chapel name must be at least 1 character',
      'string.max': 'Chapel name must not exceed 100 characters',
      'any.required': 'Chapel name is required',
    }),
    description: Joi.string().trim().max(500).optional().allow('').messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  })),
  chapelController.createChapel
);

// Update a chapel
router.patch(
  '/:id',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      'string.min': 'Chapel name must be at least 1 character',
      'string.max': 'Chapel name must not exceed 100 characters',
    }),
    description: Joi.string().trim().max(500).optional().allow('').messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
  })),
  chapelController.updateChapel
);

// Delete a chapel
router.delete('/:id', validate(schemas.uuidParam, 'params'), chapelController.deleteChapel);

module.exports = router;
