const SOSService = require('../services/sosService');
const Logger = require('../utils/logger.util');

class SOSController {
    // ===================== PILGRIM APIs =====================

    /**
     * Pilgrim: Create SOS request
     * POST /api/sos
     */
    static async createSOS(req, res) {
        try {
            const sos = await SOSService.createSOS(req.user.id, req.body);

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
    }

    /**
     * Pilgrim: Get my SOS requests
     * GET /api/sos/my
     */
    static async getMySOS(req, res) {
        try {
            const result = await SOSService.getMySOS(req.user.id, req.query);

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
    }

    /**
     * Pilgrim: Get SOS detail
     * GET /api/sos/:id
     */
    static async getSOSDetail(req, res) {
        try {
            const sos = await SOSService.getSOSDetail(req.user.id, req.params.id);

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
    }

    /**
     * Pilgrim: Cancel SOS request
     * DELETE /api/sos/:id
     */
    static async cancelSOS(req, res) {
        try {
            const sos = await SOSService.cancelSOS(req.user.id, req.params.id);

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
    }

    // ===================== LOCAL GUIDE APIs =====================

    /**
     * LocalGuide: Get SOS at my site
     * GET /api/local-guide/sos
     */
    static async getSiteSOS(req, res) {
        try {
            const result = await SOSService.getSiteSOS(req.user.id, req.query);

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
    }

    /**
     * LocalGuide: Get SOS detail
     * GET /api/local-guide/sos/:id
     */
    static async getSOSDetailForGuide(req, res) {
        try {
            const sos = await SOSService.getSOSDetailForGuide(req.user.id, req.params.id);

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
    }

    /**
     * LocalGuide: Assign (accept) SOS
     * PATCH /api/local-guide/sos/:id/assign
     */
    static async assignSOS(req, res) {
        try {
            const sos = await SOSService.assignSOS(req.user.id, req.params.id);

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
    }

    /**
     * LocalGuide: Resolve SOS
     * PATCH /api/local-guide/sos/:id/resolve
     */
    static async resolveSOS(req, res) {
        try {
            const { notes } = req.body;
            const sos = await SOSService.resolveSOS(req.user.id, req.params.id, notes);

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
    }

    // ===================== MANAGER APIs =====================

    /**
     * Manager: Get all SOS at site
     * GET /api/manager/sos
     */
    static async getManagerSOS(req, res) {
        try {
            const result = await SOSService.getManagerSOS(req.user.id, req.query);

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
    }

    /**
     * Manager: Get SOS statistics
     * GET /api/manager/sos/stats
     */
    static async getSOSStats(req, res) {
        try {
            const stats = await SOSService.getSOSStats(req.user.id, req.query);

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
    }

    // ===================== ADMIN APIs =====================

    /**
     * Admin: Get all SOS
     * GET /api/admin/sos
     */
    static async getAdminSOS(req, res) {
        try {
            const result = await SOSService.getAdminSOS(req.user.id, req.query);

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
    }

    /**
     * Admin: Get SOS statistics
     * GET /api/admin/sos/stats
     */
    static async getAdminSOSStats(req, res) {
        try {
            const stats = await SOSService.getAdminSOSStats(req.user.id, req.query);

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
    }
}

module.exports = SOSController;

