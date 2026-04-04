const PlannerShareService = require('../../services/pilgrim/plannerShareService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class PlannerShareController {
    static localizePlannerShareResult(req, result) {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            return result;
        }

        const localizedResult = { ...result };

        if (localizedResult.messageKey) {
            localizedResult.message = req.__(localizedResult.messageKey, localizedResult.messageParams || {});
            delete localizedResult.messageKey;
            delete localizedResult.messageParams;
        }

        return localizedResult;
    }

    static async getPlannerByInviteToken(req, res) {
        try {
            const result = await PlannerShareService.getPlannerByInviteToken(req.params.token);
            return ResponseUtil.success(res, result, req.__('planner.get_success'));
        } catch (error) {
            if (error.message === 'Invite not found') {
                return ResponseUtil.notFound(res, req.__('planner.invite_not_found'));
            }
            if (error.message === 'Invite has expired') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_expired'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

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

    static async inviteFriend(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { friend_id } = req.body;
            const result = await PlannerShareService.inviteFriendToPlanner(req.params.id, req.user.id, friend_id);
            return ResponseUtil.success(res, result, req.__('planner.friend_invite_sent'));
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
            if (error.message === 'Cannot invite yourself') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_invite_self'));
            }
            if (error.message.includes('Not friends')) {
                return ResponseUtil.badRequest(res, req.__('planner.friend_invite_requires_friendship'));
            }
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, req.__('planner.user_not_found'));
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

    static async respondToInvite(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { action } = req.body;
            let result = await PlannerShareService.respondToInvite(req.params.token, req.user.id, action);
            result = PlannerShareController.localizePlannerShareResult(req, result);

            const message = result?.message || (action === 'accept'
                ? req.__('planner.invite_accepted')
                : req.__('planner.invite_rejected'));

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
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, req.__('planner.user_not_found'));
            }
            if (error.message === 'Email mismatch. This invite is for another user') {
                return ResponseUtil.forbidden(res, req.__('planner.email_mismatch'));
            }
            if (error.message === 'This friend invite is for another user') {
                return ResponseUtil.forbidden(res, req.__('planner.friend_invite_mismatch'));
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
            if (error.message === 'Share planner must have a deposit amount configured. Contact the planner owner.') {
                return ResponseUtil.badRequest(res, req.__('planner.invite_deposit_not_configured'));
            }
            if (error.message === 'Solo planner does not support invites.') {
                return ResponseUtil.badRequest(res, req.__('planner.solo_planner_no_invites'));
            }
            if (error.message === 'Failed to create payment link. Please try again.') {
                return ResponseUtil.error(res, req.__('planner.payment_link_failed'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

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

    static async removeMember(req, res) {
        try {
            let result = await PlannerShareService.removePlannerMember(
                req.params.id,
                req.params.memberId,
                req.user.id
            );
            result = PlannerShareController.localizePlannerShareResult(req, result);
            return ResponseUtil.success(res, result, req.__('planner.member_removed'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Cannot leave ongoing journey') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_ongoing'));
            }
            if (error.message === 'Cannot leave completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_completed'));
            }
            if (error.message === 'Cannot leave cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_remove_cancelled'));
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

    static async handleDepositWebhook(req, res) {
        try {
            const body = req.body;
            if (!body || (!body.data && !body.code)) {
                return res.status(200).json({
                    success: true,
                    message: req.__('planner.webhook_url_confirmed')
                });
            }

            const result = await PlannerShareService.handleDepositWebhook(body);
            const messageKey = result.messageKey || (result.success
                ? 'planner.deposit_webhook_processed'
                : 'planner.deposit_webhook_failed');

            return res.status(200).json({
                success: result.success,
                message: req.__(messageKey)
            });
        } catch (error) {
            console.error('Deposit webhook error:', error);
            return res.status(200).json({
                success: false,
                message: req.__('planner.deposit_webhook_failed')
            });
        }
    }

    static async cancelDeposit(req, res) {
        try {
            const doReject = req.body?.reject === true;
            const result = await PlannerShareService.cancelDeposit(req.user.id, req.params.id, doReject);
            const message = req.__(result.messageKey);
            return ResponseUtil.success(res, { message }, message);
        } catch (error) {
            if (error.message === 'No pending deposit found for this invite') {
                return ResponseUtil.badRequest(res, req.__('planner.no_pending_deposit'));
            }
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, req.__('planner.user_not_found'));
            }
            return ResponseUtil.error(res, req.__('planner.deposit_cancel_failed'));
        }
    }

    static async getMyInvites(req, res) {
        try {
            const result = await PlannerShareService.getMyInvites(req.user.id, req.user.email);
            return ResponseUtil.success(res, result, req.__('planner.get_my_invites_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerShareController;
