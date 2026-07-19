const jwt = require('jsonwebtoken');

const ADMIN_ROLES = ['admin', 'super_admin'];

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireAdmin = (req, res, next) => {
  const user = req.user || req.admin;
  if (!user || (!ADMIN_ROLES.includes(user.role) && user.userType !== 'admin')) {
    return res.status(403).json({ message: 'Forbidden. Admin access required.' });
  }
  next();
};

const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    const user = req.user || req.admin;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const permissions = user.permissions || [];
    
    // Super admins / wildcard permissions allow everything
    if (permissions.includes('*') || ADMIN_ROLES.includes(user.role)) {
      return next();
    }

    if (!permissions.includes(permissionKey)) {
      return res.status(403).json({ message: `Forbidden. Missing permission: ${permissionKey}` });
    }

    next();
  };
};

module.exports = { authenticate, requireAdmin, requirePermission };
