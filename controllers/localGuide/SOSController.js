const { LocalGuideSOSService } = require('../../services/localGuide');
const Logger = require('../../utils/logger.util');

/**
 * LocalGuide: Get SOS at my site
 * GET /api/local-guide/sos
 */
exports.getSiteSOS = async (req, res) => {
    try {
        const result = await LocalGuideSOSService.getSiteSOS(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.list_success'),
            data: result
        });
    } catch (error) {
        Logger.error('Get site SOS controller error:', error);
        const isUnauthorized = error.message === 'unauthorized';
        const message = isUnauthorized ? req.__('sos.unauthorized') : error.message;
        return res.status(isUnauthorized ? 403 : 400).json({
            success: false,
            message
        });
    }
};

/**
 * LocalGuide: Get SOS detail
 * GET /api/local-guide/sos/:id
 */
exports.getSOSDetailForGuide = async (req, res) => {
    try {
        const sos = await LocalGuideSOSService.getSOSDetailForGuide(req.user.id, req.params.id);

        return res.status(200).json({
            success: true,
            message: req.__('sos.get_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Get SOS detail for guide controller error:', error);
        const isNotFound = error.message === 'not_found';
        const message = ['not_found', 'unauthorized'].includes(error.message)
            ? req.__(`sos.${error.message}`)
            : error.message;
        return res.status(isNotFound ? 404 : 400).json({
            success: false,
            message
        });
    }
};

/**
 * LocalGuide: Assign (accept) SOS
 * PATCH /api/local-guide/sos/:id/assign
 */
exports.assignSOS = async (req, res) => {
    try {
        const sos = await LocalGuideSOSService.assignSOS(req.user.id, req.params.id);

        return res.status(200).json({
            success: true,
            message: req.__('sos.assign_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Assign SOS controller error:', error);
        const message = ['not_found', 'already_accepted', 'not_pending', 'unauthorized'].includes(error.message)
            ? req.__(`sos.${error.message}`)
            : error.message;
        return res.status(400).json({
            success: false,
            message
        });
    }
};

/**
 * LocalGuide: Resolve SOS
 * PATCH /api/local-guide/sos/:id/resolve
 */
exports.resolveSOS = async (req, res) => {
    try {
        const { notes } = req.body;
        const sos = await LocalGuideSOSService.resolveSOS(req.user.id, req.params.id, notes);

        return res.status(200).json({
            success: true,
            message: req.__('sos.resolve_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Resolve SOS controller error:', error);
        const message = ['not_found', 'already_resolved', 'was_cancelled', 'only_assigned_can_resolve', 'unauthorized'].includes(error.message)
            ? req.__(`sos.${error.message}`)
            : error.message;
        return res.status(400).json({
            success: false,
            message
        });
    }
};
