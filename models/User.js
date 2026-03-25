const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      default: null,
    },

    // Verification & Reset
    verificationToken: String,

    // Forgot Password - OTP
    resetOTP: {
      type: String,
      default: null,
    },
    resetOTPExpiry: {
      type: Date,
      default: null,
    },

    // Forgot Password - Reset Token
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },

    // Old fields (keep for compatibility)
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Enrolled courses list
    enrolledCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    // Device trust for "Remember Device" feature
    trustedDevices: [
      {
        deviceId: String,
        trustedAt: {
          type: Date,
          default: Date.now,
        },
        trustedUntil: Date,
      },
    ],

    // Login attempts tracking for rate limiting
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const bcrypt = require("bcryptjs");
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password (supports both new bcrypt hashes and legacy plain-text)
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password || typeof this.password !== 'string') {
    return false;
  }

  // If the stored password doesn't look like a bcrypt hash (starts with $2a$, $2b$, or $2y$),
  // we do a direct comparison (Legacy support for old accounts).
  if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$") && !this.password.startsWith("$2y$")) {
    return enteredPassword === this.password;
  }

  // Otherwise, use bcrypt to compare securely
  const bcrypt = require("bcryptjs");
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked due to failed login attempts
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 3 failed attempts for 15 minutes
  const maxAttempts = 3;
  const lockTimeInMinutes = 15;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = {
      lockUntil: Date.now() + lockTimeInMinutes * 60 * 1000,
    };
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model("User", userSchema);
