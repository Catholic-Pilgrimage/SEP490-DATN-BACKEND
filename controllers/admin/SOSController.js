const { adminSOSService } = require('../../services/admin');
const Logger = require('../../utils/logger.util');

/**
 * Admin: Get all SOS
 * GET /api/admin/sos
 */
exports.getAdminSOS = async (req, res) => {
    try {
        const result = await adminSOSService.getAdminSOS(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.list_success'),
            data: result
        });
    } catch (error) {
        Logger.error('Get admin SOS controller error:', error);
        const isUnauthorized = error.message === 'unauthorized';
        const message = isUnauthorized ? req.__('sos.unauthorized') : error.message;
        return res.status(isUnauthorized ? 403 : 400).json({
            success: false,
            message
        });
    }
};

/**
 * Admin: Get SOS statistics
 * GET /api/admin/sos/stats
 */
exports.getAdminSOSStats = async (req, res) => {
    try {
        const stats = await adminSOSService.getAdminSOSStats(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.stats_success'),
            data: stats
        });
    } catch (error) {
        Logger.error('Get admin SOS stats controller error:', error);
        const isUnauthorized = error.message === 'unauthorized';
        const message = isUnauthorized ? req.__('sos.unauthorized') : error.message;
        return res.status(isUnauthorized ? 403 : 400).json({
            success: false,
            message
        });
    }
};
