const authenticatedRule = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Admin route protection
    if (role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access denied' });
    }

    // Advertiser route protection (allow admin too)
    if (role === 'advertiser' && req.user.role !== 'advertiser' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Advertiser access denied' });
    }

    // Block regular users from admin or ads routes
    if (
      req.user.role === 'user' &&
      (req.originalUrl.startsWith('/api/admin') ||
       req.originalUrl.startsWith('/api/ads'))
    ) {
      return res.status(403).json({ message: 'Access denied for user role' });
    }

    next();
  };
};

module.exports = authenticatedRule;
