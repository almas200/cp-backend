const mongoose = require("mongoose");
const User = require("./models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const user = await User.findOne({ email: "almasmansuri2004@gmail.com" }); // Or whatever the admin email is
        if (!user) {
            const anyAdmin = await User.findOne({ role: "admin" });
            if (!anyAdmin) return console.log("No admins found!");
            console.log("Found admin:", anyAdmin.email, "Role:", anyAdmin.role);
            const token = jwt.sign(
                { id: anyAdmin._id, role: anyAdmin.role, name: anyAdmin.name, email: anyAdmin.email },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
            console.log("Decoded Token:", jwt.verify(token, process.env.JWT_SECRET));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
