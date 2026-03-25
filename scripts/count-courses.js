// scripts/count-courses.js
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Course = require("../models/Course");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected");

    const total = await Course.countDocuments({});
    const kaggle = await Course.countDocuments({ createdBy: "Kaggle Import" });
    const manual = await Course.countDocuments({ createdBy: { $ne: "Kaggle Import" } });

    console.log({ total, kaggle, manual });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
