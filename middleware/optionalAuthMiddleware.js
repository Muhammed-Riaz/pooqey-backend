// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// const optionalAuthMiddleware = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1]; // Bearer token

//   if (!token) {
//     return next(); // No token, allow anonymous
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id).select('-password');
//     if (user) {
//       req.user = user;
//     }
//   } catch (err) {
//     console.log('Invalid token, continuing anonymously.');
//   }

//   next(); // Continue regardless of token validity
// };

// module.exports = optionalAuthMiddleware;







const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuthMiddleware = async (req, res, next) => {
  // Try header token first
  let token = req.headers.authorization?.split(' ')[1];

  // If not found, try cookie token
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(); // No token, guest user
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch (err) {
    console.log('Invalid token, continuing anonymously.');
  }

  next();
};

module.exports = optionalAuthMiddleware;
