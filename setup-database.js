// cp-server/scripts/seed-udemy-courses.js
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const slugify = require("slugify");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ====== CONFIG ======
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

// Udemy CSV ka path (udemy_courses.csv ko cp-server/data me rakho)
const CSV_PATH = path.join(__dirname, "./data/udemy_courses.csv");

// ====== COURSE MODEL ======
const Course = require("./models/Course");

// ====== HELPERS ======
function mapLevel(level) {
  if (!level) return "beginner";
  const l = level.toLowerCase();
  if (l.includes("beginner")) return "beginner";
  if (l.includes("intermediate")) return "intermediate";
  if (l.includes("expert")) return "advanced";
  if (l.includes("all levels")) return "beginner"; // ya "advanced" agar tu chahe
  return "beginner";
}

function makeSlug(title, course_id) {
  const base = slugify(title, { lower: true, strict: true });
  return `${base}-${course_id}`; // course_id add to avoid duplicate slug
}

function makeDescription(row) {
  const title = row.course_title;
  const subject = row.subject;
  const level = row.level;
  return `${title} is a ${level} course in ${subject}. This imported course is part of a large demo catalog used to showcase the platform experience.`;
}

// ====== MAIN SEED FUNCTION ======
async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const courses = [];

    console.log("Reading CSV from:", CSV_PATH);

    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_PATH)
        .pipe(csv())
        .on("data", (row) => {
          try {
            const course_id = row.course_id;
            const title = row.course_title;
            const is_paid = row.is_paid === "True" || row.is_paid === true;
            const price = Number(row.price) || 0;
            const num_lectures = Number(row.num_lectures) || 1;
            const content_duration = Number(row.content_duration) || 0;
            const levelRaw = row.level || "";
            const subject = row.subject || "General";

            const level = mapLevel(levelRaw);
            const slug = makeSlug(title, course_id);
            const totalDurationMinutes = Math.round(content_duration * 60);

            const course = {
              title,
              slug,
              description: makeDescription(row),
              price: is_paid ? price : 0,
              thumbnail: `https://picsum.photos/seed/${course_id}/600/400`,
              videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // demo URL
              lessonsCount: num_lectures,
              totalDurationMinutes,
              level,
              category: subject,
              tagLine:
                title.length > 60 ? title.slice(0, 57) + "..." : title,
              createdBy: "Kaggle Import",
              isPublished: true,
              isFeatured: Math.random() < 0.05, // ~5% featured
              lastUpdated: new Date(row.published_timestamp || Date.now()),
              tags: [subject, levelRaw].filter(Boolean),
            };

            courses.push(course);
          } catch (err) {
            console.error("Row parse error:", err.message);
          }
        })
        .on("end", () => {
          console.log(`CSV read complete, total rows: ${courses.length}`);
          resolve();
        })
        .on("error", (err) => {
          reject(err);
        });
    });

    // Agar pehle se Kaggle imports hain to clear kar sakta hai:
    // await Course.deleteMany({ createdBy: "Kaggle Import" });

    const toInsert = courses; // ya slice(0, 800) if chaahe

    console.log(`Inserting ${toInsert.length} courses into MongoDB...`);
    try {
      await Course.insertMany(toInsert, { ordered: false });
    } catch (err) {
      if (err.code === 11000) {
        console.log("Some duplicates were skipped.");
      } else {
        throw err;
      }
    }
    console.log("✅ Seed complete");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();
