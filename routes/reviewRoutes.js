const express = require('express');
const router = express.Router({ mergeParams: true });
const { createReview, getCourseReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.route('/:courseId')
    .get(getCourseReviews)
    .post(protect, createReview);

module.exports = router;
