const JwtUtil = require('../utils/jwt.util');
const ResponseUtil = require('../utils/response.util');
const { User, BlacklistedToken } = require('../models');
const i18nMiddleware = require('./i18n.middleware');

/**
 * Middleware xác thực JWT token
 * Kiểm tra token trong header Authorization và gắn thông tin user vào req.user
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return ResponseUtil.unauthorized(res, 'No token provided');
    }

    const blacklisted = await BlacklistedToken.findOne({ where: { token } });
    if (blacklisted) {
      return ResponseUtil.unauthorized(res, 'Token has been revoked');
    }

    const decoded = JwtUtil.verifyToken(token);
    if (!decoded) {
      return ResponseUtil.unauthorized(res, 'Invalid or expired token');
    }


    if (decoded.type !== 'access') {
      return ResponseUtil.unauthorized(res, 'Invalid token type');
    }


    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return ResponseUtil.unauthorized(res, 'User not found');
    }

    if (user.status === 'banned') {
      return ResponseUtil.forbidden(res, req.__('auth.account_banned'));
    }


    req.user = user;


    if (user.language) {
      req.setLocale(user.language);
    }

    next();
  } catch (error) {
    return ResponseUtil.error(res, 'Authentication error');
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, req.__('auth.unauthorized'));
    }

    if (!roles.includes(req.user.role)) {
      return ResponseUtil.forbidden(res, req.__('auth.insufficient_permissions'));
    }

    next();
  };
};

module.exports = authMiddleware;
module.exports.authorize = authorize;
