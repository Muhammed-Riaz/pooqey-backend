const { check } = require('express-validator');

exports.validateBooking = [
  // Ad validation
  check('adId', 'Ad ID is required').notEmpty().isMongoId(),
  
  // Date validation
  check('date', 'Valid check-in date is required')
    .notEmpty()
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),
  
  check('endDate', 'Valid check-out date is required')
    .notEmpty()
    .isISO8601()
    .toDate()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.date)) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),

  // Client validation
  check('client.name', 'Client name is required (3-50 characters)')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 }),
    
  check('client.whatsapp', 'Valid WhatsApp number is required')
    .notEmpty()
    .trim()
    .isMobilePhone(),
    
  check('client.persons', 'Number of persons must be at least 1')
    .optional()
    .isInt({ min: 1 })
    .toInt(),

  // Month/Year validation
  check('month', 'Month is required')
    .notEmpty()
    .isIn(['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December']),
           
  check('year', 'Valid year is required (2020-2030)')
    .notEmpty()
    .isInt({ min: 2020, max: 2030 })
    .toInt()
];