const { PilgrimSOSService } = require('../../services/pilgrim');
const Logger = require('../../utils/logger.util');

/**
 * Pilgrim: Create SOS request
 * POST /api/sos
 */
exports.createSOS = async (req, res) => {
    try {
        const sos = await PilgrimSOSService.createSOS(req.user.id, req.body);

        return res.status(201).json({
            success: true,
            message: req.__('sos.create_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Create SOS controller error:', error);
        const message = error.message.startsWith('sos.') || ['already_pending', 'not_found', 'unauthorized'].includes(error.message)
            ? req.__(`sos.${error.message}`)
            : error.message;
        return res.status(400).json({
            success: false,
            message
        });
    }
};

/**
 * Pilgrim: Get my SOS requests
 * GET /api/sos/my
 */
exports.getMySOS = async (req, res) => {
    try {
        const result = await PilgrimSOSService.getMySOS(req.user.id, req.query);

        return res.status(200).json({
            success: true,
            message: req.__('sos.list_success'),
            data: result
        });
    } catch (error) {
        Logger.error('Get my SOS controller error:', error);
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Pilgrim: Get SOS detail
 * GET /api/sos/:id
 */
exports.getSOSDetail = async (req, res) => {
    try {
        const sos = await PilgrimSOSService.getSOSDetail(req.user.id, req.params.id);

        return res.status(200).json({
            success: true,
            message: req.__('sos.get_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Get SOS detail controller error:', error);
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
 * Pilgrim: Cancel SOS request
 * DELETE /api/sos/:id
 */
exports.cancelSOS = async (req, res) => {
    try {
        const sos = await PilgrimSOSService.cancelSOS(req.user.id, req.params.id);

        return res.status(200).json({
            success: true,
            message: req.__('sos.cancel_success'),
            data: sos
        });
    } catch (error) {
        Logger.error('Cancel SOS controller error:', error);
        const message = ['not_found', 'cannot_cancel', 'unauthorized'].includes(error.message)
            ? req.__(`sos.${error.message}`)
            : error.message;
        return res.status(400).json({
            success: false,
            message
        });
    }
};
