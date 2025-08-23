// middlewares/checkRole.js
const jwt = require('jsonwebtoken');

const checkRole = (role) => {
  return (req, res, next) => {
    // const token = req.headers.authorization?.split(" ")[1];
    // if (!token) {
    //   return res.status(401).json({ message: "Unauthorized: No token provided" });
    // }

    const token = req.cookies.token
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== role) {
        return res.status(403).json({ message: `Access denied. ${role} only.` });
      }

      req.user = decoded; // store user info in request
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }
  };
};

module.exports = checkRole;
