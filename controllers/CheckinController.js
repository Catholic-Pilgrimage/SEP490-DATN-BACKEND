const CheckinService = require('../services/checkinService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

class CheckinController {
    /**
     * Check in at a planner item
     * POST /planner-items/:id/checkin
     */
    static async checkin(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(
                    res,
                    'Validation failed',
                    formatValidationErrors(errors.array())
                );
            }

            const { latitude, longitude, note, checkin_latitude, checkin_longitude } = req.body;
            // Hỗ trợ cả 2 params: :id và :itemId tùy route
            const plannerItemId = req.params.itemId || req.params.id;
            const userId = req.user.id;
            
            // Map body keys
            const lat = checkin_latitude !== undefined ? checkin_latitude : latitude;
            const lng = checkin_longitude !== undefined ? checkin_longitude : longitude;

            // Call service
            const result = await CheckinService.checkin(
                userId,
                plannerItemId,
                lat,
                lng,
                note
            );

            return ResponseUtil.success(res, result, req.__('checkin.success'));
        } catch (err) {
            // Handle specific errors
            if (err.message === 'You are not a member of this plan') {
                return ResponseUtil.forbidden(res, req.__('checkin.not_member'));
            }
            if (err.message.startsWith('The plan has been')) {
                const status = err.message.split(' ')[4].replace(',', '');
                return ResponseUtil.badRequest(res, req.__('checkin.planner_finished', { status }));
            }
            if (err.message === 'This site has not started or has closed, cannot check-in') {
                return ResponseUtil.badRequest(res, req.__('checkin.item_not_open'));
            }
            if (err.message === 'You have already checked-in at this site') {
                return ResponseUtil.badRequest(res, req.__('checkin.already_checked_in'));
            }
            if (err.message === 'Planner item does not belong to this planner') {
                return ResponseUtil.badRequest(res, req.__('checkin.not_in_planner'));
            }
            if (err.message.startsWith('Sequential required:')) {
                const parts = err.message.replace('Sequential required: ', '').split(', ');
                const day = parts[0].replace('day ', '');
                const order = parts[1].replace('order ', '');
                return ResponseUtil.badRequest(res, req.__('checkin.sequential_required', { day, order }));
            }
            if (err.message === 'Site coordinates not available') {
                return ResponseUtil.badRequest(res, req.__('checkin.coordinates_unavailable'));
            }
            if (err.message === 'Cannot calculate distance. Please try again.') {
                return ResponseUtil.error(res, req.__('checkin.distance_calc_failed'), 503);
            }
            if (err.message.startsWith('Too far:')) {
                const parts = err.message.replace('Too far: ', '').split(', ');
                const distance = parts[0].replace('distance ', '');
                const radius = parts[1].replace('radius ', '');
                return ResponseUtil.badRequest(res, req.__('checkin.too_far', { distance, radius }));
            }

            // Generic error
            return ResponseUtil.error(res, err.message || req.__('error.server_error'), 500);
        }
    }

    /**
     * [Trưởng đoàn] Cập nhật trạng thái điểm đến (Chốt sổ hoặc Bỏ qua)
     * PATCH /planners/:id/items/:itemId/status
     */
    static async updateItemStatus(req, res) {
        try {
            const plannerItemId = req.params.itemId || req.params.id;
            const userId = req.user.id; // Owner ID
            const { status } = req.body;

            if (!status || !['visited', 'skipped'].includes(status)) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'));
            }

            let result;
            if (status === 'visited') {
                result = await CheckinService.completeItem(userId, plannerItemId);
                return ResponseUtil.success(res, result, req.__('checkin.complete_item_success'));
            } else if (status === 'skipped') {
                result = await CheckinService.skipItemByOwner(userId, plannerItemId);
                return ResponseUtil.success(res, result, req.__('checkin.skip_success'));
            }
        } catch (err) {
            if (err.message === 'Only the Leader can perform this action') {
                return ResponseUtil.forbidden(res, req.__('checkin.owner_only'));
            }
            if (err.message.startsWith('The plan has been')) {
                const status = err.message.split(' ')[4].replace(',', '');
                return ResponseUtil.badRequest(res, req.__('checkin.planner_finished_change', { status }));
            }
            if (err.message === 'This site is already closed, cannot change') {
                return ResponseUtil.badRequest(res, req.__('checkin.item_closed'));
            }
            if (err.message === 'This site has not started or has finished, cannot complete') {
                return ResponseUtil.badRequest(res, req.__('checkin.item_not_in_progress'));
            }
            return ResponseUtil.error(res, err.message || req.__('error.server_error'), 500);
        }
    }

    /**
     * Get planner progress (tiến độ của tất cả thành viên)
     * GET /planners/:id/progress
     */
    static async getPlannerProgress(req, res) {
        try {
            const plannerId = req.params.id;
            const userId = req.user.id;

            const result = await CheckinService.getPlannerProgress(plannerId, userId);
            return ResponseUtil.success(res, result, req.__('checkin.get_progress_success'));
        } catch (err) {
            if (err.message === 'You do not have permission to view this progress') {
                return ResponseUtil.forbidden(res, req.__('checkin.no_permission_view'));
            }
            return ResponseUtil.error(res, err.message || req.__('error.server_error'), 500);
        }
    }

    /**
     * Get user's check-in history
     * GET /checkins/me
     */
    static async getUserCheckins(req, res) {
        try {
            const userId = req.user.id;
            const result = await CheckinService.getUserCheckins(userId);
            return ResponseUtil.success(res, result, req.__('checkin.get_history_success'));
        } catch (err) {
            return ResponseUtil.error(res, err.message || req.__('error.server_error'), 500);
        }
    }
}

module.exports = CheckinController;
