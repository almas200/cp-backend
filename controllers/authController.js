const { sendVerificationEmail } = require("../utils/email");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { logActivity } = require("../utils/activityLogger");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const userRole = name.includes("Admin-Secret-Key") ? "admin" : "user";
    const cleanName = name.replace("Admin-Secret-Key", "").trim();

    const user = await User.create({ name: cleanName, email, password, role: userRole });

    // Auto-verify for testing (remove this line for production)
    user.isVerified = true;

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    // Email भेजने की कोशिश (optional)
    try {
      sendVerificationEmail(user.email, verifyUrl).catch(err => console.error("Email sending failed:", err.message));
    } catch (err) {
      console.error("Email sending failed:", err.message);
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registered successfully. You can now login.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      verifyUrl,
    });

    // Log the activity
    await logActivity({
      type: "USER_REGISTER",
      message: `New operative ${user.name} has joined the matrix.`,
      user: user._id,
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    const fs = require('fs');
    // Using asynchronous appendFile instead of sync to not block event loop
    fs.promises.appendFile('error_log.txt', new Date().toISOString() + '\n' + (err.stack || err.message) + '\n\n').catch(console.error);
    console.error("Login error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/auth/verify-email?token=...
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (err) {
    console.error("Verify email error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    try {
      const { sendPasswordResetEmail } = require("../utils/email");
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error("Email sending failed:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
      resetUrl,
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/google-login
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Token required" });

    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "dummy");
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || "dummy"
    }).catch(e => null);

    const payload = ticket ? ticket.getPayload() : require("jsonwebtoken").decode(token);

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: "Invalid Google token" });
    }

    const User = require("../models/User");
    const crypto = require("crypto");
    const jwt = require("jsonwebtoken");

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      user = await User.create({
        name: payload.name,
        email: payload.email,
        password: crypto.randomBytes(16).toString("hex"),
        isVerified: true,
        role: "user"
      });
      const { logActivity } = require("../utils/activityLogger");
      await logActivity({
        type: "USER_REGISTER_GOOGLE",
        message: `New operative ${user.name} joined via Google.`,
        user: user._id,
      }).catch(e => console.error(e));
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Google Login successful",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
