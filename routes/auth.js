const express = require("express");
const { register, login, verifyEmail } = require("../controllers/authController");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);

const { googleLogin } = require("../controllers/authController");
router.post('/google-login', googleLogin);

const { forgotPassword, resetPassword } = require("../controllers/authController");

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
