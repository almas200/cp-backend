// cp-server/routes/course.js
const express = require("express");
const Course = require("../models/Course");
const { protect } = require("../middleware/auth");

const router = express.Router();

// GET /api/courses  → public course list
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select("title slug description price thumbnail level lessonsCount");
    res.json({ success: true, courses });
  } catch (err) {
    console.error("Get courses error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/courses/:slug → single course detail
router.get("/:slug", async (req, res) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug.toLowerCase(),
      isPublished: true,
    });

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, course });
  } catch (err) {
    console.error("Get course detail error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/courses/:id/enroll → requires login
router.post("/:id/enroll", protect, async (req, res) => {
  try {
    const courseId = req.params.id;

    // User model import karo
    const User = require("../models/User");
    const user = await User.findById(req.user._id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Ensure field exists
    if (!Array.isArray(user.enrolledCourses)) {
      user.enrolledCourses = [];
    }

    // Already enrolled?
    if (user.enrolledCourses.includes(courseId)) {
      return res.json({
        success: true,
        alreadyEnrolled: true,
        message: "Already enrolled in this course",
      });
    }

    user.enrolledCourses.push(courseId);
    await user.save();

    res.json({
      success: true,
      message: "Enrolled successfully in the course",
    });
  } catch (err) {
    console.error("Enroll error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/courses/:slug/dynamic-video → get or fetch contextual video
router.get("/:slug/dynamic-video", async (req, res) => {
  try {
    const course = await Course.findOne({
      slug: req.params.slug.toLowerCase(),
      isPublished: true,
    });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // 1. Check Cache: If we already found a dynamic video, return it instantly
    if (course.dynamicVideoUrl) {
      return res.json({ success: true, videoUrl: course.dynamicVideoUrl });
    }

    // 2. Fetch new video dynamically using yt-search (No API Key Required)
    const ytSearch = require("yt-search");
    const searchQuery = `${course.title} full course tutorial in hindi english`;

    // We only need top few results
    const r = await ytSearch(searchQuery);
    const videos = r.videos.slice(0, 3);

    if (videos.length > 0) {
      const topVideo = videos[0];
      // Convert standard watch URL to embed URL
      const embedUrl = `https://www.youtube.com/embed/${topVideo.videoId}`;

      // 3. Cache it permanently
      course.dynamicVideoUrl = embedUrl;
      await course.save();

      return res.json({ success: true, videoUrl: embedUrl });
    }

    // Fallback if somehow youtube search returns nothing
    return res.json({ success: true, videoUrl: course.videoUrl });

  } catch (err) {
    console.error("Dynamic video fetch error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
