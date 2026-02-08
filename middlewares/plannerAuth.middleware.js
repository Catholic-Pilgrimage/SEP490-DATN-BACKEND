const { Planner } = require('../models');

/**
 * Flexible authentication middleware
 * Allows access via:
 * 1. Owner authentication (req.user from JWT)
 * 2. Share token (query param: ?share_token=xxx)
 * 
 * Sets req.accessMode to 'owner' or 'viewer'
 * Owner is identified by user_id in planners table (NULL role = owner)
 */
const authenticateOwnerOrToken = async (req, res, next) => {
    try {
        // Check if user is authenticated (owner)
        if (req.user) {
            req.accessMode = 'owner';
            return next();
        }

        // Check for share token
        const shareToken = req.query.share_token || req.headers['x-share-token'];

        if (!shareToken) {
            return res.status(401).json({
                success: false,
                error: { message: 'Authentication required' }
            });
        }

        // Find planner by share token
        const planner = await Planner.findOne({
            where: {
                id: req.params.id,
                share_token: shareToken
            }
        });

        if (!planner) {
            return res.status(403).json({
                success: false,
                error: { message: 'Invalid or expired share token' }
            });
        }

        // All shared access is viewer-only
        req.accessMode = 'viewer';
        req.sharedPlanner = planner;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Server error' }
        });
    }
};

/**
 * Require owner permission only
 */
const requireOwner = (req, res, next) => {
    if (req.accessMode !== 'owner') {
        return res.status(403).json({
            success: false,
            error: { message: 'Owner permission required' }
        });
    }
    next();
};

module.exports = {
    authenticateOwnerOrToken,
    requireOwner
};
