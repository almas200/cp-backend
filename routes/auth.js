const express = require("express");
const { register, login, verifyEmail } = require("../controllers/authController");
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);

router.post('/google-login', async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    // User को DB में find या create कर
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, name, profilePicture: picture, googleId: ticket.subject });
      await user.save();
    }

    // JWT token generate कर
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token: jwtToken, user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

const { forgotPassword, resetPassword } = require("../controllers/authController");

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
