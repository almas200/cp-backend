const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
        rating: {
            type: Number,
            required: [true, 'Please provide a rating'],
            min: 1,
            max: 5,
        },
        comment: {
            type: String,
            required: [true, 'Please provide review text'],
        },
        course: {
            type: mongoose.Schema.ObjectId,
            ref: 'Course',
            required: true,
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Prevent user from submitting more than one review per course
reviewSchema.index({ course: 1, user: 1 }, { unique: true });

// Static method to calculate average rating and save to course
reviewSchema.statics.calculateAverageRating = async function (courseId) {
    const result = await this.aggregate([
        {
            $match: { course: courseId },
        },
        {
            $group: {
                _id: '$course',
                averageRating: { $avg: '$rating' },
                numOfReviews: { $sum: 1 },
            },
        },
    ]);

    try {
        if (result.length > 0) {
            await this.model('Course').findByIdAndUpdate(courseId, {
                averageRating: Math.ceil(result[0].averageRating * 10) / 10,
                numOfReviews: result[0].numOfReviews,
            });
        } else {
            await this.model('Course').findByIdAndUpdate(courseId, {
                averageRating: 0,
                numOfReviews: 0,
            });
        }
    } catch (err) {
        console.error(err);
    }
};

reviewSchema.post('save', async function () {
    await this.constructor.calculateAverageRating(this.course);
});

reviewSchema.post('remove', async function () {
    await this.constructor.calculateAverageRating(this.course);
});

module.exports = mongoose.model('Review', reviewSchema);
