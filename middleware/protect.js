const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // Get token from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists'
      });
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        expired: true
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed or invalid'
    });
  }
};

module.exports = protect;



