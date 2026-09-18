const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authenticated. Please log in." });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn("⚠️ JWT_SECRET is not configured in environment variables.");
    }
    const decoded = jwt.verify(token, secret || "smartlearn_default_jwt_secret");
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of [${allowedRoles.join(", ")}] role.`,
      });
    }
    next();
  };
};

authMiddleware.authMiddleware = authMiddleware;
authMiddleware.requireRole = requireRole;

module.exports = authMiddleware;
