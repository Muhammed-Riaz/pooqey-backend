const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);



const setAuthCookies = (res, token, user) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  // Optional: Set a non-httpOnly cookie for client-side access if needed
  res.cookie('userRole', user.role, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
};

// Google authentication callback (for passport strategy)
exports.googleAuthCallback = async (req, res, next) => {
  try {
    if (!req.user) return res.redirect('/login?error=authentication_failed');

    const googleUser = req.user;
    const role = user ? user.role : 'user'; // Do NOT trust req.session.role


    let user = await User.findOne({
      $or: [
        { email: googleUser.emails[0].value },
        { googleId: googleUser.id }
      ]
    });

    function formatUserResponse(user) {
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || '',
        isVerified: user.isVerified,
        authMethod: user.authMethod
      };
    }

    const formattedUser = formatUserResponse(user);
    console.log("Formatted User:", formattedUser);



    console.log("Outside IF - Found user:", user);

    // 🔵 If user does not exist, create a new Google user
    if (!user) {
      const newUser = new User({
        fullName: googleUser.displayName || '',
        email: googleUser.emails[0].value,
        profileImage: googleUser.photos?.[0]?.value || '',
        googleId: googleUser.id,
        authMethod: 'google',
        role: 'user',
        isVerified: false
      });

      user = await newUser.save(); // ✅ Set saved user back to variable

    } else {
      // 🔴 Block role mismatch (user can't login with wrong role)
      if (user.role !== role && user.role !== 'admin') {
        return res.status(403).send("You are not allowed to login with this role.");
      }

      // 🟡 Update user info if needed
      if (!user.googleId) {
        user.googleId = googleUser.id;
      }

      user.authMethod = 'google'; // ✅ Ensure correct method
      user.isVerified = false;

      if (googleUser.photos?.[0]?.value && !user.profileImage) {
        user.profileImage = googleUser.photos[0].value;
      }
    }

    await user.save(); // ✅ No validation error now

    // 🟢 Login the user and redirect
    req.login(user, (err) => {
      if (err) return next(err);

      if (user.role === 'admin') {
        return res.redirect(`${process.env.FRONTEND_URL}/admin/dashboard`);
      } else if (user.role === 'advertiser') {
        return res.redirect(`${process.env.FRONTEND_URL}/advertiser/dashboard`);
      } else {
        return res.redirect(`${process.env.FRONTEND_URL}/`);
      }
    });
  } catch (error) {
    next(error);
  }
};



exports.verifyGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ success: false, message: "Unverified Google account" });
    }

    const { name, email, picture, sub: googleId } = payload;

    // ✅ Enforce allowed email domains if needed
    const allowedDomains = process.env.ALLOWED_DOMAINS.split(',');
    const emailDomain = email.split('@')[1];
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(403).json({ success: false, message: "Email domain not allowed" });
    }

    // ✅ Lookup user
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (!user) {
      user = new User({
        fullName: name,
        email,
        googleId,
        profilePicture: picture || '',
        role: 'user', // ✅ Role is always fixed to 'user'
        isVerified: true,
        authMethod: 'google',
        terms: true
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.profilePicture) user.profilePicture = picture;
      user.authMethod = 'google';
      user.isVerified = true;
    }

    await user.save();

  
      const jwtToken = formatUserResponse(user)


    // Set cookies
    setAuthCookies(res, jwtToken, formatUserResponse(user));



    // ✅ Send response with secure headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    return res.json({
      success: true,
      // token: jwtToken,
      // user: formatUserResponse(user)
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ success: false, message: "Authentication failed" });
  }
};




exports.verifyGoogleTokenadmin = async (req, res, next) => {
  try {
    const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];

    const { token } = req.body;

    // ✅ Validate token input
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // ✅ Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ success: false, message: "Unverified Google account" });
    }

    const { name, email, picture, sub: googleId } = payload;

    // ✅ Check if email is in admin list
    const isAdmin = ADMIN_EMAILS.includes(email);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized: You are not an admin." });
    }

    // ✅ Find user by email or Google ID
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (!user) {
      // ✅ Create new admin user
      user = new User({
        fullName: name,
        email,
        googleId,
        profileImage: picture || '',
        role: 'admin', // ✅ Force admin role for listed emails
        isVerified: true,
        authMethod: 'google',
        terms: true
      });
    } else {
      // ✅ Update existing user to admin if allowed
      if (!user.googleId) user.googleId = googleId;
      if (picture && !user.profileImage) user.profileImage = picture;
      user.authMethod = 'google';
      user.role = 'admin';
      user.isVerified = true;
    }

    await user.save();

    // ✅ Generate secure JWT with claims
   const jwtToken = formatUserResponse(user);

    // Generate JWT
 
    // Set cookies
    setAuthCookies(res, jwtToken, formatUserResponse(user));

  

    // ✅ Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    return res.json({
      success: true,
      token: jwtToken,
      user: formatUserResponse(user)
    });

  } catch (error) {
    console.error("Google Admin Auth Error:", error);
    return res.status(500).json({ success: false, message: "Admin authentication failed" });
  }
};



// Get current authenticated user
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.cookies.token;
     console.log('Cookies:', req.cookies); // <-- check if token present here
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};



// Logout user
exports.logout = (req, res) => {
  // Clear JWT cookie
  res.clearCookie('token');

  // Destroy session if using sessions
  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }

    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // 🔹 Redirect to homepage
    return res.redirect('/');
  });
};



// ✅ FIXED: User response formatter
function formatUserResponse(user) {
  return {
    id: user._id,
    fullName: user.fullName, // ✅ Fixed line
    email: user.email,
    role: user.role,
    profileImage: user.profileImage || '',
    isVerified: user.isVerified,
    authMethod: user.authMethod
  };
}
