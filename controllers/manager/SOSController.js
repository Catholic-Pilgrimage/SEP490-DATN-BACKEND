const { ManagerSOSService } = require('../../services/manager');
const Logger = require('../../utils/logger.util');

/**
 * Manager: Get all SOS at site
 * GET /api/manager/sos
 */
exports.getManagerSOS = async (req, res) => {
    try {
        const result = await ManagerSOSService.getManagerSOS(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.list_success'),
            data: result
        });
    } catch (error) {
        Logger.error('Get manager SOS controller error:', error);
        const isUnauthorized = error.message === 'unauthorized';
        const message = isUnauthorized ? req.__('sos.unauthorized') : error.message;
        return res.status(isUnauthorized ? 403 : 400).json({
            success: false,
            message
        });
    }
};

/**
 * Manager: Get SOS statistics
 * GET /api/manager/sos/stats
 */
exports.getSOSStats = async (req, res) => {
    try {
        const stats = await ManagerSOSService.getSOSStats(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.stats_success'),
            data: stats
        });
    } catch (error) {
        Logger.error('Get SOS stats controller error:', error);
        const isUnauthorized = error.message === 'unauthorized';
        const message = isUnauthorized ? req.__('sos.unauthorized') : error.message;
        return res.status(isUnauthorized ? 403 : 400).json({
            success: false,
            message
        });
    }
};
