const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
}

const Course = require("../models/Course");

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Clear existing courses (which contains the thumbnail glitch)
        console.log("Clearing old courses...");
        await Course.deleteMany({});

        // 2. Create the precise course the user asked for
        console.log("Inserting the new Official Course...");

        const newCourse = {
            title: "The Ultimate Full-Stack Web Development Course",
            slug: "the-ultimate-full-stack-course",
            description: "Master modern web development with this comprehensive guide to frontend and backend frameworks. Start from scratch and build production-ready applications.",
            price: 0, // Free or whatever
            thumbnail: "https://img.youtube.com/vi/D3cXHQr_a9k/maxresdefault.jpg",
            videoUrl: "https://www.youtube.com/embed/D3cXHQr_a9k", // Highlighted video
            lessonsCount: 3,
            totalDurationMinutes: 120,
            level: "beginner",
            category: "Web Development",
            tagLine: "Master Web Dev with this top-rated course",
            createdBy: "Admin",
            isPublished: true,
            isFeatured: true,
            tags: ["Web Development", "Full Stack", "Beginner"],
            lessons: [
                {
                    title: "Introduction to Web Development",
                    description: "Understanding the basics of how the web works.",
                    videoUrl: "https://www.youtube.com/embed/D3cXHQr_a9k",
                    durationMinutes: 40,
                    order: 1
                },
                {
                    title: "Frontend Foundations",
                    description: "Building responsive, modern UIs.",
                    videoUrl: "https://www.youtube.com/embed/D3cXHQr_a9k",
                    durationMinutes: 45,
                    order: 2
                },
                {
                    title: "Backend & Apis",
                    description: "Connecting your app to a database.",
                    videoUrl: "https://www.youtube.com/embed/D3cXHQr_a9k",
                    durationMinutes: 35,
                    order: 3
                }
            ]
        };

        await Course.create(newCourse);

        console.log("✅ Custom Seed complete! Database updated.");
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed error:", err.message);
        process.exit(1);
    }
}

seed();
