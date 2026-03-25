const express = require("express");
const { protect } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET /api/user/me
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// GET /api/user/my-courses
router.get("/my-courses", protect, async (req, res) => {
  try {
    console.log("MY-COURSES: user id =", req.user && req.user._id);

    const user = await User.findById(req.user._id).populate("enrolledCourses");

    console.log(
      "MY-COURSES: loaded user?",
      !!user,
      "courses count",
      user && user.enrolledCourses && user.enrolledCourses.length
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      courses: user.enrolledCourses || [],
    });
  } catch (err) {
    console.error("MY-COURSES ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
});

// PUT /api/user/update-profile
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      return res
        .status(400)
        .json({ success: false, message: "Name or email is required" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
});

// PUT /api/user/change-password
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Both passwords are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to change password" });
  }
});

module.exports = router;
