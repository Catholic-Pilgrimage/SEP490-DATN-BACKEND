const PlannerService = require('../services/plannerService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

class PlannerController {
    /**
     * POST /planners - Create a new planner
     */
    static async createPlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.createPlanner(req.user.id, req.body);
            return ResponseUtil.created(res, result, req.__('planner.create_success'));
        } catch (error) {
            if (error.message === 'Name is required') {
                return ResponseUtil.badRequest(res, req.__('planner.name_required'));
            }
            if (error.message === 'Number of days must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_days'));
            }
            if (error.message === 'Number of people must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_people'));
            }
            if (error.message === 'Planner exceeds 30 days') {
                return ResponseUtil.badRequest(res, req.__('planner.exceeds_max_days'));
            }
            if (error.message === 'Planner dates overlap') {
                return ResponseUtil.badRequest(res, req.__('planner.dates_overlap', { dates: error.conflictDates.join(', ') }), { conflict_dates: error.conflictDates });
            }
            if (error.message === 'End date must be after or equal to start date') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_end_date'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners - Get user's planners
     */
    static async getUserPlanners(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.getUserPlanners(req.user.id, req.query);
            return ResponseUtil.success(res, result, req.__('planner.list_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id - Get planner by ID
     */
    static async getPlannerById(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.getPlannerById(req.params.id, req.user?.id);
            return ResponseUtil.success(res, result, req.__('planner.get_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PUT /planners/:id - Update planner
     */
    static async updatePlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.updatePlanner(req.params.id, req.user.id, req.body);
            return ResponseUtil.success(res, result, req.__('planner.update_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Number of days must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_days'));
            }
            if (error.message === 'Number of people must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_people'));
            }
            if (error.message.includes('End date must be')) {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_end_date'));
            }
            if (error.message === 'Planner exceeds 30 days') {
                return ResponseUtil.badRequest(res, req.__('planner.exceeds_max_days'));
            }
            if (error.message === 'Planner dates overlap') {
                return ResponseUtil.badRequest(res, req.__('planner.dates_overlap', { dates: error.conflictDates.join(', ') }), { conflict_dates: error.conflictDates });
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id - Delete planner
     */
    static async deletePlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.deletePlanner(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('planner.delete_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/items - Add item to planner
     */
    static async addPlannerItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.addPlannerItem(req.params.id, req.user?.id, req.body);

            // If there's a warning, include it in the response
            if (result.warning) {
                return ResponseUtil.created(res, result, req.__('planner.item_add_success_with_warning'));
            }

            return ResponseUtil.created(res, result, req.__('planner.item_add_success'));
        } catch (error) {
            console.error('Add planner item error:', error.message);

            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Site not found') {
                return ResponseUtil.notFound(res, req.__('planner.site_not_found'));
            }
            if (error.message.includes('Invalid day number')) {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_leg_number_range', { max: error.message.match(/\d+/)?.[0] || '?' }));
            }
            if (error.message.includes('Cannot add the same site consecutively')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Quãng đường quá xa')) {
                return ResponseUtil.badRequest(res, req.__('planner.distance_too_far'));
            }
            if (error.message.includes('missing coordinates')) {
                const siteName = error.message.match(/"([^"]+)"/)?.[1] || '';
                return ResponseUtil.badRequest(res, req.__('planner.site_missing_coordinates', { siteName }));
            }
            if (error.message.includes('Cannot calculate travel time')) {
                const sites = error.message.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
                return ResponseUtil.badRequest(res, req.__('planner.travel_time_calc_failed', { fromSite: sites[0] || '', toSite: sites[1] || '' }));
            }
            if (error.message.includes('Travel time between sites is too long')) {
                const hours = error.message.match(/(\d+) hours/)?.[1] || '?';
                return ResponseUtil.badRequest(res, req.__('planner.travel_time_too_long', { hours }));
            }
            if (error.message.includes('Total time for day')) {
                const dayMatch = error.message.match(/day (\d+)/)?.[1] || '?';
                const hoursMatch = error.message.match(/(\d+) hours/)?.[1] || '?';
                return ResponseUtil.badRequest(res, req.__('planner.total_time_exceeds_24h', { day: dayMatch, hours: hoursMatch }));
            }
            if (error.message === 'Estimated time is required') {
                return ResponseUtil.badRequest(res, 'Giờ dự kiến không được để trống');
            }
            if (error.message === 'Rest duration is required') {
                return ResponseUtil.badRequest(res, 'Thời gian nghỉ ngơi không được để trống');
            }
            if (error.message.includes('Thời gian di chuyển quá dài')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Thời gian di chuyển từ ngày')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Thời gian đến')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Bạn sẽ đến khoảng')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('không hợp lệ')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Vượt quá ngày hiện tại')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Bạn không thể thêm địa điểm cho Ngày')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Ngày')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Sự kiện')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('Đã có địa điểm khác với giờ')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.includes('closed on') || error.message.includes('Site is closed at')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id/items/:itemId - Delete item
     */
    static async deletePlannerItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.deletePlannerItem(
                req.params.id,
                req.user.id,
                req.params.itemId
            );

            return ResponseUtil.success(res, result, req.__('planner.item_delete_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Item not found') {
                return ResponseUtil.notFound(res, req.__('planner.item_not_found'));
            }
            if (error.message === 'Item does not belong to this planner') {
                return ResponseUtil.badRequest(res, req.__('planner.item_not_belong'));
            }
            if (error.message === 'Không thể xóa địa điểm đang trong quá trình thực hiện') {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.startsWith('Invalid day number')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message === 'Day number must be at least 1') {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PUT /planners/:id/items/:itemId - Update planner item
     */
    static async updatePlannerItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.updatePlannerItem(
                req.params.id,
                req.user?.id,
                req.params.itemId,
                req.body
            );

            return ResponseUtil.success(res, result, req.__('planner.item_update_success'));
        } catch (error) {
            console.error('Update planner item error:', error.message);

            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Item not found') {
                return ResponseUtil.notFound(res, req.__('planner.item_not_found'));
            }
            if (error.message === 'Item does not belong to this planner') {
                return ResponseUtil.badRequest(res, req.__('planner.item_not_belong'));
            }
            if (error.message === 'Can only update estimated_time for the first item of the day') {
                return ResponseUtil.badRequest(res, req.__('planner.only_first_item_estimated_time'));
            }
            if (error.message.includes('closed on') || error.message.includes('Site is closed at')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            // Catch time validation errors (Vietnamese)
            if (error.message.includes('không hợp lệ') || error.message.includes('Đã có địa điểm khác với giờ')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/complete - Mark planner as completed
     */
    static async completePlanner(req, res) {
        try {
            const result = await PlannerService.completePlanner(req.params.id, req.user.id);

            // Customize message based on final status
            let message = 'Đã hoàn thành kế hoạch hành hương';
            if (result.status === 'expir') {
                message = 'Kế hoạch đã hết hạn (checkin dưới 80%)';
            }

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner is not ongoing') {
                return ResponseUtil.badRequest(res, 'Chỉ có thể hoàn thành kế hoạch đang tiến hành');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/start - Start planner (change status from planning to ongoing)
     */
    static async startPlanner(req, res) {
        try {
            const result = await PlannerService.startPlanner(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, 'Đã bắt đầu kế hoạch hành hương');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner is not in planning status') {
                return ResponseUtil.badRequest(res, 'Chỉ có thể bắt đầu kế hoạch đang trong trạng thái lập kế hoạch');
            }
            if (error.message === 'Planner must have start_date and end_date to start') {
                return ResponseUtil.badRequest(res, 'Kế hoạch phải có ngày bắt đầu và ngày kết thúc để bắt đầu');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id/status - Update planner status (start/complete)
     * Body: { status: 'ongoing' | 'completed' | 'expired' }
     */
    static async updatePlannerStatus(req, res) {
        try {
            const { status } = req.body;

            // Validate status
            const validStatuses = ['ongoing', 'completed', 'expired'];
            if (!status || !validStatuses.includes(status)) {
                return ResponseUtil.badRequest(res, `Status không hợp lệ. Chọn: ${validStatuses.join(', ')}`);
            }

            const result = await PlannerService.updatePlannerStatus(req.params.id, req.user.id, status);

            // Customize message based on status
            let message = 'Cập nhật trạng thái thành công';
            if (status === 'ongoing') {
                message = 'Đã bắt đầu kế hoạch hành hương';
            } else if (status === 'completed') {
                message = 'Đã hoàn thành kế hoạch hành hương';
            } else if (status === 'expired') {
                message = 'Kế hoạch đã hết hạn (checkin dưới 80%)';
            }

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message.startsWith('Không thể chuyển trạng thái')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message === 'Planner must have start_date and end_date to start') {
                return ResponseUtil.badRequest(res, 'Kế hoạch phải có ngày bắt đầu và ngày kết thúc để bắt đầu');
            }
            if (error.message.startsWith('Không thể hoàn thành kế hoạch')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message.startsWith('Chỉ có thể hoàn thành kế hoạch')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }



    /**
     * GET /planners/:id/progress - Lấy tiến độ của tất cả thành viên
     */
    static async getPlannerProgress(req, res) {
        try {
            const CheckinService = require('../services/checkinService');
            const result = await CheckinService.getPlannerProgress(
                req.params.id,
                req.user.id
            );
            return ResponseUtil.success(res, result, 'Lấy tiến độ thành công');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message.includes('Không có quyền')) {
                return ResponseUtil.forbidden(res, error.message);
            }
            return ResponseUtil.error(res, error.message || req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id/transactions - Lấy sao kê quỹ nhóm
     * Cho phép owner + tất cả members (kể cả kicked/dropped_out) xem
     */
    static async getPlannerTransactions(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { Planner, PlannerMember } = require('../models');
            const plannerId = req.params.id;
            const userId = req.user?.id;

            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }

            // Access check: owner OR active joined member only
            if (planner.user_id !== userId) {
                const memberRecord = await PlannerMember.findOne({
                    where: { planner_id: plannerId, user_id: userId, join_status: 'joined' }
                });
                if (!memberRecord) {
                    return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
                }
            }

            // Lấy transaction từ WalletService
            const WalletService = require('../services/pilgrim/walletService');
            const result = await WalletService.getPlannerTransactions(plannerId, req.query);
            return ResponseUtil.success(res, result, 'Lấy sao kê quỹ nhóm thành công');
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerController;

