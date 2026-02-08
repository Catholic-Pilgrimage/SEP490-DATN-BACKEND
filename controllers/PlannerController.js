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
                return ResponseUtil.badRequest(res, req.__('planner.invalid_day_number_range', { max: error.message.match(/\d+/)?.[0] || '?' }));
            }
            if (error.message.includes('Cannot add the same site consecutively')) {
                return ResponseUtil.badRequest(res, req.__('planner.consecutive_site_not_allowed'));
            }
            if (error.message.includes('closed on')) {
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_on_day'));
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
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id/items/reorder - Reorder items
     */
    static async reorderPlannerItems(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.reorderPlannerItems(
                req.params.id,
                req.user?.id,
                req.body.day_number,
                req.body.item_ids
            );

            return ResponseUtil.success(res, result, req.__('planner.reorder_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Invalid day number') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_day_number'));
            }
            if (error.message === 'Invalid item ID in reorder list') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_item_id'));
            }
            if (error.message.includes('missing coordinates')) {
                const siteName = error.message.match(/"([^"]+)"/)?.[1] || '';
                return ResponseUtil.badRequest(res, req.__('planner.site_missing_coordinates', { siteName }));
            }
            if (error.message.includes('Cannot calculate travel time')) {
                const sites = error.message.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
                return ResponseUtil.badRequest(res, req.__('planner.travel_time_calc_failed', { fromSite: sites[0] || '', toSite: sites[1] || '' }));
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
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/share-token - Create/update share token
     */
    static async createShareToken(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.createShareToken(
                req.params.id,
                req.user.id
            );

            return ResponseUtil.success(res, result, req.__('planner.share_token_created'));
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
     * DELETE /planners/:id/share - Disable sharing
     */
    static async disableShare(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.disableShare(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('planner.share_disabled'));
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
     * POST /planners/:id/complete - Mark planner as completed
     */
    static async completePlanner(req, res) {
        try {
            const result = await PlannerService.completePlanner(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, 'Đã hoàn thành kế hoạch hành hương');
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
     * POST /planners/:id/invite - Invite user to planner
     */
    static async inviteUser(req, res) {
        try {
            const { email } = req.body;
            const result = await PlannerService.inviteUserToPlanner(
                req.params.id,
                req.user.id,
                email
            );
            return ResponseUtil.success(res, result, 'Đã gửi lời mời thành công');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy kế hoạch');
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, 'Chỉ chủ kế hoạch mới có thể mời người khác');
            }
            if (error.message === 'Can only invite when planner is in planning status') {
                return ResponseUtil.badRequest(res, 'Chỉ có thể mời khi kế hoạch đang ở trạng thái lên kế hoạch');
            }
            if (error.message.includes('Planner is full')) {
                return ResponseUtil.badRequest(res, req.__('planner.planner_full'));
            }
            if (error.message.includes('User not found')) {
                return ResponseUtil.notFound(res, req.__('planner.user_not_registered'));
            }
            if (error.message === 'User already invited') {
                return ResponseUtil.badRequest(res, req.__('planner.pending_invite_exists'));
            }
            if (error.message === 'User is already a member') {
                return ResponseUtil.badRequest(res, req.__('planner.already_member'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/invite/:token - Respond to invite (accept/reject)
     */
    static async respondToInvite(req, res) {
        try {
            const { action } = req.body;
            
            if (!action || !['accept', 'reject'].includes(action)) {
                return ResponseUtil.badRequest(res, 'Action phải là "accept" hoặc "reject"');
            }

            const result = await PlannerService.respondToInvite(req.params.token, req.user.id, action);
            
            const message = action === 'accept' ? 'Đã chấp nhận lời mời' : 'Đã từ chối lời mời';
            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Invalid action. Must be "accept" or "reject"') {
                return ResponseUtil.badRequest(res, 'Hành động không hợp lệ');
            }
            if (error.message === 'Invite not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy lời mời');
            }
            if (error.message === 'Invite already processed') {
                return ResponseUtil.badRequest(res, 'Lời mời đã được xử lý');
            }
            if (error.message === 'Invite has expired') {
                return ResponseUtil.badRequest(res, 'Lời mời đã hết hạn');
            }
            if (error.message.includes('Planner is full')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            if (error.message === 'Email mismatch. This invite is for another user') {
                return ResponseUtil.forbidden(res, 'Lời mời này dành cho người dùng khác');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id/invites - Get planner invites
     */
    static async getInvites(req, res) {
        try {
            const result = await PlannerService.getPlannerInvites(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, 'Lấy danh sách lời mời thành công');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy kế hoạch');
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, 'Không có quyền xem danh sách lời mời');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id/members - Get planner members
     */
    static async getMembers(req, res) {
        try {
            const result = await PlannerService.getPlannerMembers(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, 'Lấy danh sách thành viên thành công');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy kế hoạch');
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, 'Không có quyền xem danh sách thành viên');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id/members/:memberId - Remove member
     */
    static async removeMember(req, res) {
        try {
            const result = await PlannerService.removePlannerMember(
                req.params.id,
                req.params.memberId,
                req.user.id
            );
            return ResponseUtil.success(res, result, 'Đã xóa thành viên');
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy kế hoạch');
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, 'Chỉ chủ kế hoạch mới có thể xóa thành viên');
            }
            if (error.message === 'Cannot remove members during ongoing trip') {
                return ResponseUtil.badRequest(res, 'Không thể xóa thành viên khi đang đi');
            }
            if (error.message === 'Cannot remove owner') {
                return ResponseUtil.badRequest(res, 'Không thể xóa chủ kế hoạch');
            }
            if (error.message === 'Member not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy thành viên');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerController;
