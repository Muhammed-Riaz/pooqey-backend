// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('../models/User');

// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
//   scope: ['profile', 'email']
// },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await User.findOne({ googleId: profile.id });

//       if (!user) {
//         user = await User.create({
//           googleId: profile.id,
//           fullName: profile.displayName,
//           email: profile.emails?.[0].value || null,
//           profileImage: profile.photos?.[0].value || ''
//         });
//       }


//       return done(null, user); // Send user object for session
//     } catch (error) {
//       return done(error, null);
//     }
//   }
// ));

// // Save user to session
// passport.serializeUser((user, done) => {
//   done(null, user._id); // Only save ID
// });

// // Load user from session
// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     done(null, user); // Attach full user to req.user
//   } catch (err) {
//     done(err, null);
//   }
// });





const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const crypto = require('crypto');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/api/auth/google/callback`,
  scope: ['profile', 'email'],
  passReqToCallback: true // ✅ To handle CSRF token or custom checks
},
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // ✅ CSRF check using state param
      if (req.query.state !== req.session.oauthState) {
        return done(new Error('Invalid OAuth state'), null);
      }

      const email = profile.emails?.[0]?.value || null;
      const isEmailVerified = profile._json?.email_verified;

      // ✅ Block if email not verified
      if (!isEmailVerified) {
        return done(new Error('Email not verified by Google'), null);
      }

      // ✅ Restrict allowed domains (optional)
      const allowedDomains = (process.env.ALLOWED_DOMAINS || '').split(',');
      const emailDomain = email?.split('@')[1];
      if (allowedDomains.length && !allowedDomains.includes(emailDomain)) {
        return done(new Error('Email domain not allowed'), null);
      }

      // ✅ Lookup user securely
      let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

      if (!user) {
        user = new User({
          googleId: profile.id,
          fullName: profile.displayName,
          email: email,
          profilePicture: profile.photos?.[0]?.value || '',
          role: 'user', // ✅ Default role (never from Google)
          authMethod: 'google',
          isVerified: true
        });
      } else {
        // ✅ Update Google ID if missing
        if (!user.googleId) user.googleId = profile.id;
        user.authMethod = 'google';
        user.isVerified = true;
      }

      await user.save();

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// ✅ Generate OAuth state token for CSRF protection
function generateOAuthState(req, res, next) {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  next();
}

// ✅ Serialize user to session (only ID)
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// ✅ Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = { passport, generateOAuthState };
