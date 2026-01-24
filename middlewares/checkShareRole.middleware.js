const { Planner } = require('../models');
const ResponseUtil = require('../utils/response.util');

/**
 * Middleware to check share token and role permissions
 * @param {string} requiredRole - 'viewer' or 'editor'
 */
const checkShareRole = (requiredRole) => {
    return async (req, res, next) => {
        try {
            // Extract token from params, body, or query
            const token = req.params.token || req.body.share_token || req.query.share_token;

            if (!token) {
                return ResponseUtil.forbidden(res, 'Missing token');
            }

            // Find planner by token
            const planner = await Planner.findOne({
                where: {
                    share_token: token,
                    is_public: true
                }
            });

            if (!planner) {
                return ResponseUtil.forbidden(res, 'Invalid token');
            }

            // Check role permission
            if (requiredRole === 'editor' && planner.share_role !== 'editor') {
                return ResponseUtil.forbidden(res, 'Read only');
            }

            // Attach planner to request for downstream use
            req.sharedPlanner = planner;
            next();
        } catch (error) {
            console.error('Check share role error:', error);
            return ResponseUtil.error(res, 'Server error');
        }
    };
};

module.exports = checkShareRole;
