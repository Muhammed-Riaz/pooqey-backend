const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const checkRole = require('../middleware/checkRole'); // ✅ Middleware for role check
const authController = require('../controllers/authController');
const { passport, generateOAuthState } = require('../config/passport');
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


router.get('/google', generateOAuthState, passport.authenticate('google', {
  scope: ['profile', 'email'],
  state: true // ✅ Automatically includes req.session.oauthState
}));


router.post("/google/login", async (req, res) => {
  try {
    const { token, role } = req.body;

    if (!token || !role) {
      return res.status(400).json({ success: false, message: "Token and role are required" });
    }

    // ✅ Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // ✅ Check if user exists in DB
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({ success: false, message: "Account not found" });
    }

    // ✅ Strict role check from DB
    if (user.role !== role) {
      return res.status(403).json({ success: false, message: `Not authorized as ${role}` });
    }

    // ✅ Generate JWT
    const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.cookie("token", jwtToken, {
  httpOnly: true, // JavaScript se access nahi hoga
  secure: process.env.NODE_ENV === "production", // Sirf HTTPS par
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
  maxAge: 24 * 60 * 60 * 1000 // 1 day
});


    res.json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        fullName: user.fullName || name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || picture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
});

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
    session: true // ✅ If you're using sessions
  }),
  (req, res) => {
    // ✅ Prevent session fixation attack
    req.session.regenerate(() => {
      res.redirect('/dashboard');
    });
  }
);
// ✅ Optional: Token-based login
router.post('/google/user', authController.verifyGoogleToken);
router.post('/google/admin', authController.verifyGoogleTokenadmin);

// ✅ Get logged-in user
// router.get('/current', authController.getCurrentUser);


router.get('/current', async (req, res) => {
  try {
     console.log('Cookies:', req.cookies); // <-- check if token present here
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password'); // password hide karo

    if (!user) return res.status(401).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});


// ✅ Logout
router.post('/logout',  authController.logout);

// ✅ Advertiser Google Login
router.post("/google/advertiser", async (req, res) => {
  try {
    const { token } = req.body;

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    // ✅ Find user in DB
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({ success: false, message: "Account not found." });
    }

    if (user.role !== "advertiser") {
      return res.status(403).json({ success: false, message: "Not an advertiser." });
    }

    // ✅ Generate JWT
    // const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    //   expiresIn: "7d",
    // });

    res.json({
      success: true,
      // token: jwtToken,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
});

// ✅ Admin-only route
// ✅ Admin-only route
router.get('/admin', checkRole('admin'), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

// ✅ Advertiser-only route
router.get('/advertiser', checkRole('advertiser'), (req, res) => {
  res.json({ message: "Welcome Advertiser" });
});


module.exports = router;








