const PlannerContinuationService = require('../../services/pilgrim/plannerContinuationService');
const ResponseUtil = require('../../utils/response.util');

class PlannerContinuationController {
    /**
     * POST /planners/:id/continue - Create or join a continuation planner
     */
    static async continuePlanner(req, res) {
        try {
            const result = await PlannerContinuationService.createOrJoinContinuation(
                req.params.id,
                req.user.id,
                req.body
            );

            return ResponseUtil.success(
                res,
                result,
                req.__('planner.continuation_success') || 'Bắt đầu hành trình tiếp nối thành công.'
            );
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Continuation is only available for cancelled planners') {
                return ResponseUtil.badRequest(res, req.__('planner.continuation_not_cancelled'));
            }
            if (error.message === 'Only active members of the original planner can continue') {
                return ResponseUtil.forbidden(res, req.__('planner.continuation_not_member'));
            }
            if (error.message === 'Original owner cannot initiate continuation') {
                return ResponseUtil.badRequest(res, req.__('planner.continuation_owner_restricted'));
            }
            if (error.message === 'Continuation journey is no longer active') {
                return ResponseUtil.badRequest(res, req.__('planner.continuation_inactive'));
            }
            if (error.message === 'Continuation journey already started') {
                return ResponseUtil.badRequest(res, req.__('planner.continuation_already_started'));
            }
            if (error.message === 'No remaining items to continue') {
                return ResponseUtil.badRequest(res, req.__('planner.continuation_no_items'));
            }

            console.error('Continuation controller error:', error);
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerContinuationController;
