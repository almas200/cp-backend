// cp-server/routes/courseAdminRoutes.js
const express = require("express");
const router = express.Router();

const Course = require("../models/Course");
const { protect, adminOnly } = require("../middleware/auth");

// POST /api/admin/courses  -> Create course
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, course });
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ success: false, message: "Error creating course" });
  }
});

// GET /api/admin/courses  -> List courses (filters + pagination + total)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      search,
      category,
      level,
      isPublished,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category) {
      query.category = category;
    }
    if (level) {
      query.level = level;
    }
    if (typeof isPublished !== "undefined") {
      query.isPublished = isPublished === "true";
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Course.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: courses,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Get courses error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching courses" });
  }
});

// GET /api/admin/courses/:id  -> Single course by id
router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, course });
  } catch (err) {
    console.error("Get course error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error fetching course" });
  }
});

// PUT /api/admin/courses/:id  -> Update course
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    req.body.lastUpdated = new Date();

    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, course });
  } catch (err) {
    console.error("Update course error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error updating course" });
  }
});

// PATCH /api/admin/courses/:id/publish  -> Toggle publish
router.patch("/:id/publish", protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    course.isPublished = !course.isPublished;
    course.lastUpdated = new Date();
    await course.save();

    res.json({ success: true, course });
  } catch (err) {
    console.error("Toggle publish error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error updating course status" });
  }
});

// DELETE /api/admin/courses/:id  -> Delete course
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({ success: true, message: "Course deleted" });
  } catch (err) {
    console.error("Delete course error:", err);
    res
      .status(500)
      .json({ success: false, message: "Error deleting course" });
  }
});

module.exports = router;
