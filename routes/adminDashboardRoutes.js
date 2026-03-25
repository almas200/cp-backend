const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Activity = require("../models/Activity");
const { Parser } = require("json2csv");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/admin/dashboard/stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();

    // This month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    const newEnrollmentsThisMonth = await Enrollment.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Revenue calculation (from Enrollment with price)
    const enrollmentsWithPrice = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseData"
        }
      },
      {
        $unwind: "$courseData"
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$courseData.price" }
        }
      }
    ]);

    const totalRevenue = enrollmentsWithPrice[0]?.totalRevenue || 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        newUsersThisMonth,
        newEnrollmentsThisMonth,
        totalRevenue,
        avgCoursePrice: totalCourses > 0 ? (totalRevenue / totalEnrollments) : 0
      }
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

// GET /api/admin/dashboard/charts/revenue
router.get("/charts/revenue", protect, adminOnly, async (req, res) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const revenueData = await Enrollment.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseData"
        }
      },
      {
        $unwind: "$courseData"
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$courseData.price" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      chartData: revenueData.map(item => ({
        date: item._id,
        revenue: item.revenue
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching revenue data" });
  }
});

// GET /api/admin/dashboard/revenue/breakdown
router.get("/revenue/breakdown", protect, adminOnly, async (req, res) => {
  try {
    const breakdown = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseData"
        }
      },
      { $unwind: "$courseData" },
      {
        $group: {
          _id: "$courseId",
          title: { $first: "$courseData.title" },
          thumbnail: { $first: "$courseData.thumbnail" },
          enrollments: { $sum: 1 },
          revenue: { $sum: "$courseData.price" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error("Revenue breakdown error:", err);
    res.status(500).json({ success: false, message: "Error fetching revenue breakdown" });
  }
});

// GET /api/admin/dashboard/charts/users
router.get("/charts/users", protect, adminOnly, async (req, res) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const userData = await User.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      chartData: userData.map(item => ({
        date: item._id,
        users: item.count
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching user data" });
  }
});
// GET /api/admin/dashboard/charts/enrollments
router.get("/charts/enrollments", protect, adminOnly, async (req, res) => {
  try {
    const enrollmentByCourse = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "courseData"
        }
      },
      { $unwind: "$courseData" },
      {
        $group: {
          _id: "$courseData.title",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log("ENROLLMENTS AGG RESULT =>", enrollmentByCourse);

    res.json({
      success: true,
      chartData: enrollmentByCourse.map(item => ({
        course: item._id,
        enrollments: item.count
      }))
    });
  } catch (err) {
    console.error("Enrollments chart error:", err); // IMPORTANT
    res.status(500).json({ success: false, message: "Error fetching enrollment data" });
  }
});

// GET /api/admin/dashboard/users
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// GET /api/admin/dashboard/activity
router.get("/activity", protect, adminOnly, async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching activity" });
  }
});

// GET /api/admin/dashboard/export/users
router.get("/export/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("name email role createdAt isVerified");
    const json2csvParser = new Parser({ fields: ["name", "email", "role", "createdAt", "isVerified"] });
    const csv = json2csvParser.parse(users);

    res.header('Content-Type', 'text/csv');
    res.attachment('users-report.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting users" });
  }
});

// GET /api/admin/dashboard/export/enrollments
router.get("/export/enrollments", protect, adminOnly, async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate("userId", "name email")
      .populate("courseId", "title price");

    const data = enrollments.map(en => ({
      UserName: en.userId?.name || 'N/A',
      UserEmail: en.userId?.email || 'N/A',
      Course: en.courseId?.title || 'N/A',
      Price: en.courseId?.price || 0,
      Progress: en.overallProgress + '%',
      Status: en.status,
      Date: en.createdAt
    }));

    const fields = ["UserName", "UserEmail", "Course", "Price", "Progress", "Status", "Date"];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('enrollments-report.csv');
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error exporting enrollments" });
  }
});

module.exports = router;
