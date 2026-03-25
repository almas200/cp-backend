const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Create a review
// @route   POST /api/reviews/:courseId
// @access  Private
exports.createReview = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if user is actually enrolled in this course
        const enrollment = await Enrollment.findOne({ userId, courseId });
        if (!enrollment) {
            return res.status(403).json({ success: false, message: 'Only enrolled students can review this course.' });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ user: userId, course: courseId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this course.' });
        }

        const review = await Review.create({
            rating,
            comment,
            course: courseId,
            user: userId
        });

        res.status(201).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Create Review Error:', error);
        if (error.code === 11000) { // Duplicate key
            return res.status(400).json({ success: false, message: 'You have already reviewed this course.' });
        }
        res.status(500).json({ success: false, message: 'Server error creating review' });
    }
};

// @desc    Get all reviews for a course
// @route   GET /api/reviews/:courseId
// @access  Public
exports.getCourseReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ course: req.params.courseId })
            .populate('user', 'name avatar')
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        console.error('Get Reviews Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching reviews' });
    }
};
