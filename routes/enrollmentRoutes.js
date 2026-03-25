// const express = require("express");
// const router = express.Router();
// const Enrollment = require("../models/Enrollment");
// const Course = require("../models/Course");
// const { protect } = require("../middleware/auth");

// // POST /api/enrollments/:courseId  -> Enroll user in course
// router.post("/:courseId", protect, async (req, res) => {
//   try {
//     const course = await Course.findById(req.params.courseId);
//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     const enrollment = await Enrollment.findOneAndUpdate(
//       { user: req.user._id, course: course._id },
//       { $setOnInsert: { progressPercent: 0, hoursLearned: 0 } },
//       { new: true, upsert: true }
//     );

//     res.status(201).json({ success: true, enrollment });
//   } catch (err) {
//     console.error("Enroll error:", err);
//     res.status(500).json({ message: "Failed to enroll" });
//   }
// });

// // POST /api/enrollments/:courseId/progress  -> Update progress for a lesson
// router.post("/:courseId/progress", protect, async (req, res) => {
//   try {
//     const { lessonKey, lessonDuration } = req.body; // e.g. "0-3"

//     const course = await Course.findById(req.params.courseId);
//     if (!course) {
//       return res.status(404).json({ message: "Course not found" });
//     }

//     const totalLessons = course.lessonsCount || 1;

//     const enrollment = await Enrollment.findOne({
//       user: req.user._id,
//       course: course._id,
//     });

//     if (!enrollment) {
//       return res.status(400).json({ message: "User not enrolled" });
//     }

//     if (!enrollment.completedLessons.includes(lessonKey)) {
//       enrollment.completedLessons.push(lessonKey);

//       if (lessonDuration) {
//         enrollment.hoursLearned += Number(lessonDuration) / 60;
//       }

//       const completed = enrollment.completedLessons.length;
//       enrollment.progressPercent = Math.min(
//         100,
//         Math.round((completed / totalLessons) * 100)
//       );

//       if (enrollment.progressPercent >= 100) {
//         enrollment.status = "completed";
//       }

//       await enrollment.save();
//     }

//     res.json({ success: true, enrollment });
//   } catch (err) {
//     console.error("Progress update error:", err);
//     res.status(500).json({ message: "Failed to update progress" });
//   }
// });

// // GET /api/enrollments/my-courses  -> Courses + progress for logged-in user
// router.get("/my-courses", protect, async (req, res) => {
//   try {
//     const enrollments = await Enrollment.find({ user: req.user._id })
//       .populate("course")
//       .sort("-updatedAt");

//     const courses = enrollments.map((en) => ({
//       _id: en.course._id,
//       title: en.course.title,
//       slug: en.course.slug,
//       description: en.course.description,
//       price: en.course.price,
//       thumbnail: en.course.thumbnail,
//       level: en.course.level,
//       lessonsCount: en.course.lessonsCount,
//       lastUpdated: en.course.lastUpdated || en.updatedAt,
//       progressPercent: en.progressPercent,
//       hoursLearned: en.hoursLearned,
//     }));

//     res.json({ success: true, courses });
//   } catch (err) {
//     console.error("MY-COURSES error:", err);
//     res.status(500).json({ message: "Failed to load courses" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { protect } = require("../middleware/auth");

// POST /api/enrollments/:courseId -> Enroll user in course
router.post("/:courseId", protect, enrollmentController.enrollCourse);

// POST /api/enrollments/:courseId/progress -> Update progress for a lesson
router.post("/:courseId/progress", protect, enrollmentController.updateProgress);

// GET /api/enrollments/my-courses -> Courses + progress for logged-in user
router.get("/my-courses", protect, enrollmentController.getMyCourses);

// GET /api/enrollments/:courseId/certificate -> Generate and download PDF certificate
router.get("/:courseId/certificate", protect, enrollmentController.getCertificate);

module.exports = router;
