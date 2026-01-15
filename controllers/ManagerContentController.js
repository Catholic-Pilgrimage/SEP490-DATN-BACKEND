const ManagerContentService = require('../services/managerContentService');
const ResponseUtil = require('../utils/response.util');


/**
 * Manager: Get Site Media
 * GET /api/manager/content/media
 */
exports.getMedia = async (req, res) => {
    try {
        const { page, limit, type, status } = req.query;
        const result = await ManagerContentService.getMedia(req.user.id, {
            page, limit, type, status
        });
        return ResponseUtil.success(res, result, req.__('manager.get_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Media Status (Approve/Reject)
 * PATCH /api/manager/content/media/:id/status
 */
exports.updateMediaStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const result = await ManagerContentService.updateMediaStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('manager.media_approved')
            : req.__('manager.media_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('manager.media_not_found'));
        }
        if (error.message === 'Already reviewed') {
            return ResponseUtil.badRequest(res, req.__('manager.already_reviewed'));
        }
        if (error.message === 'Rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Toggle Media Active (Soft delete/Restore)
 * PATCH /api/manager/content/media/:id/is-active
 */
exports.toggleMediaActive = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_is_active'));
        }

        const result = await ManagerContentService.toggleMediaActive(req.user.id, req.params.id, is_active);

        const message = is_active
            ? req.__('manager.media_restored')
            : req.__('manager.media_deactivated');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('manager.media_not_found'));
        }
        if (error.message === 'Only approved media can be toggled') {
            return ResponseUtil.badRequest(res, req.__('manager.only_approved_toggle'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
