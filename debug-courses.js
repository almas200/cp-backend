const mongoose = require('mongoose');
const Course = require('./models/Course');
const fs = require('fs');
require('dotenv').config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const allCourses = await Course.find({});
        const summary = {
            total: allCourses.length,
            published: allCourses.filter(c => c.isPublished).length,
            unpublished: allCourses.filter(c => !c.isPublished).length,
            titles: allCourses.map(c => ({ title: c.title, isPublished: !!c.isPublished }))
        };
        fs.writeFileSync('course-debug-results.json', JSON.stringify(summary, null, 2));
        console.log('Results written to course-debug-results.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
