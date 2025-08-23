const express = require('express');
const router = express.Router();
const { addReview, getReviews } = require('../controllers/ReviewsController');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');

router.get('/:adId/reviews', optionalAuthMiddleware,getReviews)

router.post('/:adId/reviews', optionalAuthMiddleware, addReview)


module.exports = router;