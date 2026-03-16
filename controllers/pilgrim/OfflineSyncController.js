const OfflineSyncService = require('../../services/pilgrim/offlineSyncService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

/**
 * POST /api/sync/offline-actions
 * Sync offline actions from mobile to server
 */
exports.syncActions = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const { actions } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(actions) || actions.length === 0) {
            return ResponseUtil.badRequest(res, req.__('offline.no_actions'));
        }

        const results = await OfflineSyncService.processActions(actions, userId);

        return ResponseUtil.success(res, { results }, req.__('offline.sync_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
