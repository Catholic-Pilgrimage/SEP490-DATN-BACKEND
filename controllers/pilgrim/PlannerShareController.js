const PlannerShareService = require('../../services/pilgrim/plannerShareService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class PlannerShareController {
    /**
     * GET /planners/invite/:token - Preview planner via invite token (no auth)
     */
    static async getPlannerByInviteToken(req, res) {
        try {
            const result = await PlannerShareService.getPlannerByInviteToken(req.params.token);
            return ResponseUtil.success(res, result, req.__('planner.get_success'));
        } catch (error) {
            if (error.message === 'Invite not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy lời mời');
            }
            if (error.message === 'Invite has expired') {
                return ResponseUtil.badRequest(res, 'Lời mời đã hết hạn');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/invite - Mời người dùng
     */
    static async inviteUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { email } = req.body;
            const result = await PlannerShareService.inviteUserToPlanner(req.params.id, req.user.id, email);
            return ResponseUtil.success(res, result, req.__('planner.invite_sent'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Can only invite when planner is in planning status') {
                return ResponseUtil.badRequest(res, req.__('planner.only_planning_invite'));
            }
            if (error.message.includes('Planner is full')) {
                return ResponseUtil.badRequest(res, req.__('planner.planner_full'));
            }
            if (error.message === 'User already invited') {
                return ResponseUtil.badRequest(res, req.__('planner.pending_invite_exists'));
            }
            if (error.message === 'User is already a member') {
                return ResponseUtil.badRequest(res, req.__('planner.already_member'));
            }
            if (error.message === 'Planner join window is closed') {
                return ResponseUtil.badRequest(res, req.__('planner.join_window_closed'));
            }
            if (error.message === 'Planner must have start_date and end_date before inviting members') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_requires_dates'));
            }
            if (error.message === 'Planner schedule must be complete before inviting members') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_requires_complete_schedule'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/invite/:token - Respond to invite (accept/reject)
     */
    static async respondToInvite(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { action } = req.body;

            const result = await PlannerShareService.respondToInvite(req.params.token, req.user.id, action);

            const message = action === 'accept' ? req.__('planner.invite_accepted') : req.__('planner.invite_rejected');
            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Invalid action. Must be "accept" or "reject"') {
                return ResponseUtil.badRequest(res, req.__('validation.failed'));
            }
            if (error.message === 'Invite not found') {
                return ResponseUtil.notFound(res, req.__('planner.invite_not_found'));
            }
            if (error.message === 'Invite already processed') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_processed'));
            }
            if (error.message === 'Invite has expired') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_expired'));
            }
            if (error.message === 'Cannot respond to invite. Trip has already started or completed') {
                return ResponseUtil.badRequest(res, req.__('planner.trip_started'));
            }
            if (error.message.includes('Planner is full')) {
                return ResponseUtil.badRequest(res, req.__('planner.planner_full'));
            }
            if (error.message === 'Email mismatch. This invite is for another user') {
                return ResponseUtil.forbidden(res, req.__('planner.email_mismatch'));
            }
            if (error.message === 'Planner join window is closed') {
                return ResponseUtil.badRequest(res, req.__('planner.join_window_closed'));
            }
            if (error.message === 'Planner must have start_date and end_date before inviting members') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_requires_dates'));
            }
            if (error.message === 'Planner schedule must be complete before inviting members') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_requires_complete_schedule'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_join_locked'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id/invites - Get planner invites
     */
    static async getInvites(req, res) {
        try {
            const result = await PlannerShareService.getPlannerInvites(req.params.id, req.user.id);
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
     * GET /planners/:id/members - Get planner members
     */
    static async getMembers(req, res) {
        try {
            const result = await PlannerShareService.getPlannerMembers(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('planner.get_members_success'));
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
     * DELETE /planners/:id/members/:memberId - Remove member
     */
    static async removeMember(req, res) {
        try {
            const result = await PlannerShareService.removePlannerMember(
                req.params.id,
                req.params.memberId,
                req.user.id
            );
            return ResponseUtil.success(res, result, req.__('planner.member_removed'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Cannot leave ongoing journey') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_ongoing'));
            }
            if (error.message === 'Cannot leave completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_completed'));
            }
            if (error.message === 'Cannot leave expired plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_expired'));
            }
            if (error.message === 'Cannot remove owner') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_owner'));
            }
            if (error.message === 'Member not found') {
                return ResponseUtil.notFound(res, req.__('planner.member_not_found'));
            }
            if (error.message === 'Member already left or kicked') {
                return ResponseUtil.badRequest(res, req.__('planner.member_already_left'));
            }
            if (error.message === 'Planner member changes are closed') {
                return ResponseUtil.badRequest(res, req.__('planner.member_changes_closed'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_leave_locked'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }



    /**
     * POST /planners/deposit-webhook - Webhook PayOS xác nhận cọc (public)
     */
    static async handleDepositWebhook(req, res) {
        try {
            // PayOS sends a confirmation request when registering webhook URL
            // Handle it gracefully — return 200 so PayOS accepts the URL
            const body = req.body;
            if (!body || (!body.data && !body.code)) {
                return res.status(200).json({ success: true, message: 'Webhook URL confirmed' });
            }

            const result = await PlannerShareService.handleDepositWebhook(body);

            if (result.success) {
                return res.status(200).json({ success: true, message: 'Deposit webhook processed' });
            }

            return res.status(200).json({ success: false, message: result.message });
        } catch (error) {
            console.error('Deposit webhook error:', error);
            // IMPORTANT: Always return 200 for PayOS webhooks to avoid retries
            return res.status(200).json({ success: false, message: 'Webhook processing failed' });
        }
    }
    /**
     * POST /planners/:id/cancel-deposit - Cancel (or reset) a pending deposit
     * Body: { reject: boolean } — if true, invite is rejected permanently; if false, reset to pending for retry
     */
    static async cancelDeposit(req, res) {
        try {
            const doReject = req.body?.reject === true;
            const result = await PlannerShareService.cancelDeposit(req.user.id, req.params.id, doReject);
            const message = req.__(`wallet.${result.messageKey}`);
            return ResponseUtil.success(res, { message }, message);
        } catch (error) {
            if (error.message === 'No pending deposit found for this invite') {
                return ResponseUtil.badRequest(res, 'Không có yêu cầu đặt cọc đang chờ xử lý');
            }
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            return ResponseUtil.error(res, 'Lỗi khi huỷ thanh toán cọc');
        }
    }
}

module.exports = PlannerShareController;
