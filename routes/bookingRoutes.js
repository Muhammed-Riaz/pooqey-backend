const express = require('express');
const router = express.Router();
const { validateBooking } = require('../middleware/bookingValidation');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');



router.post('/bookings', authMiddleware, validateBooking, bookingController.createBooking);
router.get('/bookings', authMiddleware, bookingController.getBookings);
router.post('/booking-record', authMiddleware, bookingController.addBookingRecord);
router.get('/booking-record', authMiddleware, bookingController.getBookingRecord);
router.get('/bookings/monthly-turnover', authMiddleware, bookingController.monthlyTurnover);


module.exports = router;