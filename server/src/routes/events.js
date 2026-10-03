const express = require('express');
const Joi = require('joi');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const eventController = require('../controllers/eventController');

const router = express.Router();

const eventFields = {
  name: Joi.string().trim().min(1).max(150),
  slug: Joi.string().trim().max(60).allow(''),
  description: Joi.string().trim().max(1000).allow('', null),
  venue: Joi.string().trim().max(300).allow('', null),
  startDate: Joi.date().iso().allow('', null),
  endDate: Joi.date().iso().allow('', null),
  hasChariots: Joi.boolean(),
};

router.get('/', authenticateUser, eventController.getEvents);
router.get('/:id', authenticateUser, eventController.getEvent);

router.post(
  '/',
  authenticateAdmin,
  validate(Joi.object({ ...eventFields, name: eventFields.name.required() })),
  eventController.createEvent
);

router.patch(
  '/:id',
  authenticateAdmin,
  validate(Joi.object({ ...eventFields, isActive: Joi.boolean() })),
  eventController.updateEvent
);

router.post('/:id/sync-chapels', authenticateAdmin, eventController.syncEventChapels);

module.exports = router;
