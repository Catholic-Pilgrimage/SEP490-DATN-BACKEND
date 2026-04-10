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

/**
 * Manager: Assign a Local Guide to handle a pending SOS
 * PATCH /api/sos/manager/:id/assign-guide
 */
exports.assignGuide = async (req, res) => {
    try {
        const result = await ManagerSOSService.assignGuide(
            req.user.id,
            req.params.id,
            req.body.guide_id
        );

        return res.status(200).json({
            success: true,
            message: req.__('sos.assign_guide_success'),
            data: result
        });
    } catch (error) {
        Logger.error('Manager assign guide controller error:', error);

        const errorMap = {
            unauthorized: { status: 403, key: 'sos.unauthorized' },
            not_found: { status: 404, key: 'sos.not_found' },
            already_accepted: { status: 409, key: 'sos.already_accepted' },
            not_pending: { status: 400, key: 'sos.not_pending' },
            guide_not_found: { status: 404, key: 'sos.guide_not_found' },
            guide_not_same_site: { status: 400, key: 'sos.guide_not_same_site' },
        };

        const mapped = errorMap[error.message];
        const message = mapped ? req.__(mapped.key) : error.message;
        const status = mapped ? mapped.status : 400;

        return res.status(status).json({
            success: false,
            message
        });
    }
};
