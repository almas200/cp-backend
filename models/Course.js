// cp-server/models/Course.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    // Basic info
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, minlength: 20 },

    // Pricing
    price: { type: Number, required: true, min: 0 },

    // Media
    thumbnail: { type: String, default: "" },
    videoUrl: { type: String, default: "" },

    // Stats
    lessonsCount: { type: Number, default: 1 },
    totalDurationMinutes: { type: Number, default: 0 },

    // Meta
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    category: { type: String, default: "General", index: true },
    tagLine: { type: String, default: "" },

    // Ownership
    createdBy: { type: String, default: "Admin" },

    // Status
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    // Dashboard / analytics helpers
    lastUpdated: { type: Date, default: Date.now },

    tags: [{ type: String, trim: true }],

    // NEW: Real Lessons Array
    lessons: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        videoUrl: { type: String, required: true },
        durationMinutes: { type: Number, default: 0 },
        order: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
