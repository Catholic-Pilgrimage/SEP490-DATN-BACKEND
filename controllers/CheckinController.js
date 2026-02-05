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

            const { latitude, longitude, note } = req.body;
            const plannerItemId = req.params.id;
            const userId = req.user.id;

            // Call service
            const result = await CheckinService.checkin(
                userId,
                plannerItemId,
                latitude,
                longitude,
                note
            );

            return ResponseUtil.success(res, result, 'Check-in thành công');
        } catch (err) {
            // Handle specific errors
            if (err.message === 'Planner item not found') {
                return ResponseUtil.notFound(res, err.message);
            }
            if (err.message === 'Bạn đã check-in điểm này rồi') {
                return ResponseUtil.badRequest(res, err.message);
            }
            if (err.message === 'Site coordinates not available') {
                return ResponseUtil.badRequest(res, err.message);
            }
            if (err.message.includes('Không thể tính khoảng cách')) {
                return ResponseUtil.error(res, err.message, 503);
            }
            if (err.message.includes('Bạn cách địa điểm')) {
                return ResponseUtil.badRequest(res, err.message);
            }

            // Generic error
            return ResponseUtil.error(res, err.message || 'Check-in failed', 500);
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
            return ResponseUtil.success(res, result, 'Lấy danh sách check-in thành công');
        } catch (err) {
            return ResponseUtil.error(res, err.message || 'Lấy danh sách check-in thất bại', 500);
        }
    }
}

module.exports = CheckinController;
