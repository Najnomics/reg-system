const express = require('express');
const Joi = require('joi');
const { authenticateAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const chariotController = require('../controllers/chariotController');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all chariots
router.get('/', chariotController.getChariots);

// Get a single chariot
router.get('/:id', validate(schemas.uuidParam, 'params'), chariotController.getChariot);

// Create a new chariot
router.post(
  '/',
  validate(Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Chariot name must be at least 1 character',
      'string.max': 'Chariot name must not exceed 100 characters',
      'any.required': 'Chariot name is required',
    }),
    description: Joi.string().trim().max(500).optional().allow('').messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
    leaderId: Joi.string().uuid().required().messages({
      'string.guid': 'Leader ID must be a valid UUID',
      'any.required': 'Leader ID is required',
    }),
  })),
  chariotController.createChariot
);

// Update a chariot
router.patch(
  '/:id',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    name: Joi.string().trim().min(1).max(100).optional().messages({
      'string.min': 'Chariot name must be at least 1 character',
      'string.max': 'Chariot name must not exceed 100 characters',
    }),
    description: Joi.string().trim().max(500).optional().allow('').messages({
      'string.max': 'Description must not exceed 500 characters',
    }),
    leaderId: Joi.string().uuid().optional().messages({
      'string.guid': 'Leader ID must be a valid UUID',
    }),
  })),
  chariotController.updateChariot
);

// Delete a chariot
router.delete('/:id', validate(schemas.uuidParam, 'params'), chariotController.deleteChariot);

// Add assistants to chariot
router.post(
  '/:id/assistants',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
  })),
  chariotController.addAssistants
);

// Remove assistants from chariot
router.delete(
  '/:id/assistants',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
  })),
  chariotController.removeAssistants
);

// Add members to chariot
router.post(
  '/:id/members',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
  })),
  chariotController.addMembers
);

// Remove members from chariot
router.delete(
  '/:id/members',
  validate(schemas.uuidParam, 'params'),
  validate(Joi.object({
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
      'array.min': 'At least one member ID is required',
      'any.required': 'Member IDs are required',
    }),
  })),
  chariotController.removeMembers
);

module.exports = router;
