require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
//const authRoutes = require("./routes/auth");
const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/course");
//const enrollmentRoutes = require("./routes/enrollmentRoutes");
const courseAdminRoutes = require("./routes/courseAdminRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const enrollmentRoutes = require('./routes/enrollmentRoutes');
//const courseAdminRoutes = require('./routes/courseAdminRoutes');
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const aiRoutes = require("./routes/aiRoutes");

//const cors = require("cors");



const app = express();
require("./models/Course");
require("./models/User");

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/admin/courses", courseAdminRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/ai", aiRoutes);

// test route
app.get("/", (req, res) => {
  res.json({
    message: "Course Platform API is live 🚀",
    time: new Date(),
  });
});

// connect MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running at http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });
