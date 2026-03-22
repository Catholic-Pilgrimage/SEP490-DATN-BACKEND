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

            return ResponseUtil.success(res, result, 'Check-in thành công');
        } catch (err) {
            // Handle specific errors
            if (err.message === 'Planner item not found') {
                return ResponseUtil.notFound(res, err.message);
            }
            if (err.message === 'Bạn đã check-in địa điểm này rồi' || err.message === 'Bạn đã check-in điểm này rồi') {
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
            if (err.message.includes('Không phải thành viên')) {
                return ResponseUtil.forbidden(res, err.message);
            }

            // Generic error
            return ResponseUtil.error(res, err.message || 'Check-in failed', 500);
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
                return ResponseUtil.badRequest(res, 'Status không hợp lệ. Phải là "visited" hoặc "skipped"');
            }

            let result;
            if (status === 'visited') {
                result = await CheckinService.completeItem(userId, plannerItemId);
                return ResponseUtil.success(res, result, 'Đã hoàn thành điểm đến');
            } else if (status === 'skipped') {
                result = await CheckinService.skipItemByOwner(userId, plannerItemId);
                return ResponseUtil.success(res, result, 'Đã đánh dấu bỏ qua điểm đến');
            }
        } catch (err) {
            if (err.message === 'Planner item not found') {
                return ResponseUtil.notFound(res, err.message);
            }
            if (err.message.includes('Chỉ Trưởng đoàn')) {
                return ResponseUtil.forbidden(res, err.message);
            }
            if (err.message.includes('đã chốt sổ') || err.message.includes('không thể hoàn thành')) {
                return ResponseUtil.badRequest(res, err.message);
            }
            return ResponseUtil.error(res, err.message || 'Cập nhật trạng thái thất bại', 500);
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
            return ResponseUtil.success(res, result, 'Lấy tiến độ thành công');
        } catch (err) {
            if (err.message === 'Planner not found') {
                return ResponseUtil.notFound(res, err.message);
            }
            if (err.message.includes('Không có quyền')) {
                return ResponseUtil.forbidden(res, err.message);
            }
            return ResponseUtil.error(res, err.message || 'Lấy tiến độ thất bại', 500);
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
