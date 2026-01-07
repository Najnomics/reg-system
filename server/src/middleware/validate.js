const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid input data',
        details,
      });
    }

    // Replace the original data with the validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // Admin authentication
  adminLogin: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),
  }),

  // Member creation/update
  memberCreate: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number format is invalid',
    }),
  }),

  memberUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters',
    }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Email must be a valid email address',
    }),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number format is invalid',
    }),
    isActive: Joi.boolean().optional(),
  }),

  // Session creation/update
  sessionCreate: Joi.object({
    theme: Joi.string().trim().min(3).max(200).required().messages({
      'string.min': 'Theme must be at least 3 characters long',
      'string.max': 'Theme must not exceed 200 characters',
      'any.required': 'Theme is required',
    }),
    startTime: Joi.date().iso().min('now').required().messages({
      'date.min': 'Start time must be in the future',
      'any.required': 'Start time is required',
    }),
    endTime: Joi.date().iso().min(Joi.ref('startTime')).required().messages({
      'date.min': 'End time must be after start time',
      'any.required': 'End time is required',
    }),
    secretQuestion: Joi.string().trim().min(5).max(500).required().messages({
      'string.min': 'Secret question must be at least 5 characters long',
      'string.max': 'Secret question must not exceed 500 characters',
      'any.required': 'Secret question is required',
    }),
    secretAnswer: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Secret answer is required',
      'string.max': 'Secret answer must not exceed 100 characters',
      'any.required': 'Secret answer is required',
    }),
  }),

  sessionUpdate: Joi.object({
    theme: Joi.string().trim().min(3).max(200).optional().messages({
      'string.min': 'Theme must be at least 3 characters long',
      'string.max': 'Theme must not exceed 200 characters',
    }),
    startTime: Joi.date().iso().optional(),
    endTime: Joi.date().iso().optional(),
    secretQuestion: Joi.string().trim().min(5).max(500).optional().messages({
      'string.min': 'Secret question must be at least 5 characters long',
      'string.max': 'Secret question must not exceed 500 characters',
    }),
    secretAnswer: Joi.string().trim().min(1).max(100).optional().messages({
      'string.min': 'Secret answer is required',
      'string.max': 'Secret answer must not exceed 100 characters',
    }),
    isActive: Joi.boolean().optional(),
  }),

  // Check-in validation
  checkinAnswer: Joi.object({
    answer: Joi.string().trim().min(1).max(100).required().messages({
      'string.min': 'Answer is required',
      'string.max': 'Answer must not exceed 100 characters',
      'any.required': 'Answer is required',
    }),
  }),

  checkinSubmit: Joi.object({
    pin: Joi.string().pattern(/^\d{5}$/).required().messages({
      'string.pattern.base': 'PIN must be exactly 5 digits',
      'any.required': 'PIN is required',
    }),
  }),

  // Search and pagination
  searchQuery: Joi.object({
    query: Joi.string().trim().min(1).max(100).optional().allow(''),
    name: Joi.string().trim().min(1).max(100).optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional().allow(''),
    pin: Joi.string().pattern(/^\d{5}$/).optional().allow(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('name', 'email', 'createdAt').default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  // Report parameters
  reportQuery: Joi.object({
    sessionId: Joi.number().integer().positive().optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
    format: Joi.string().valid('json', 'csv', 'excel').default('json'),
    includeInactive: Joi.boolean().default(false),
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID must be a number',
      'number.integer': 'ID must be an integer',
      'number.positive': 'ID must be positive',
      'any.required': 'ID is required',
    }),
  }),

  sessionIdParam: Joi.object({
    sessionId: Joi.number().integer().positive().required().messages({
      'number.base': 'Session ID must be a number',
      'number.integer': 'Session ID must be an integer',
      'number.positive': 'Session ID must be positive',
      'any.required': 'Session ID is required',
    }),
  }),
};

module.exports = {
  validate,
  schemas,
};