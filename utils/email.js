const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendVerificationEmail = async (toEmail, verifyUrl) => {
  const mailOptions = {
    from: `"Course Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your email - Course Platform",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to Course Platform!</h2>
        <p>Click the button below to verify your account:</p>
        <p>
          <a href="${verifyUrl}" style="
            display:inline-block;
            padding:12px 24px;
            background:#6366f1;
            color:#ffffff;
            border-radius:8px;
            text-decoration:none;
            font-weight:bold;
          ">Verify Email</a>
        </p>
        <p>Or copy this link:</p>
        <p>${verifyUrl}</p>
        <p style="color: #9ca3af; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", toEmail);
  } catch (err) {
    console.error("Email send error:", err.message);
    throw err;
  }
};

exports.sendPasswordResetEmail = async (toEmail, resetUrl) => {
  const mailOptions = {
    from: `"Course Platform" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your password - Course Platform",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Click the button below to reset your password:</p>
        <p>
          <a href="${resetUrl}" style="
            display:inline-block;
            padding:12px 24px;
            background:#ef4444;
            color:#ffffff;
            border-radius:8px;
            text-decoration:none;
            font-weight:bold;
          ">Reset Password</a>
        </p>
        <p>Or copy this link:</p>
        <p>${resetUrl}</p>
        <p style="color: #9ca3af; font-size: 12px;">This link expires in 1 hour.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent to:", toEmail);
  } catch (err) {
    console.error("Email send error:", err.message);
    throw err;
  }
};
