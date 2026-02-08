const { Planner } = require('../models');
const ResponseUtil = require('../utils/response.util');

/**
 * Middleware to check share token permissions
 * All shared planners are viewer-only (owner is stored as user_id)
 */
const checkShareRole = () => {
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
                    share_token: token
                }
            });

            if (!planner) {
                return ResponseUtil.forbidden(res, 'Invalid token');
            }

            // All shared access is viewer-only
            req.sharedPlanner = planner;
            req.shareRole = 'viewer';
            next();
        } catch (error) {
            console.error('Check share role error:', error);
            return ResponseUtil.error(res, 'Server error');
        }
    };
};

module.exports = checkShareRole;
