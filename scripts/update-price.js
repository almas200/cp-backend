const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Course = require("../models/Course");

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    await Course.updateOne(
        { slug: "the-ultimate-full-stack-course" },
        { $set: { price: 1900 } }
    );
    console.log("Price updated to 1900");
    process.exit(0);
}
run();
