const PlannerEmergencyService = require('../../services/pilgrim/plannerEmergencyService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class PlannerEmergencyController {
    static translateOrFallback(req, key, fallbackMessage, params = {}) {
        const localized = req.__(key, params);
        return localized && localized !== key ? localized : fallbackMessage;
    }

    static badRequestWithFallback(res, req, key, fallbackMessage, params = {}, details = null) {
        return ResponseUtil.badRequest(
            res,
            this.translateOrFallback(req, key, fallbackMessage, params),
            details
        );
    }

    /**
     * POST /planners/:id/emergency-stop - Emergency stop an ongoing planner
     * Body: { cancelled_reason: string }
     */
    static async emergencyStopPlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const reason = typeof req.body.cancelled_reason === 'string'
                ? req.body.cancelled_reason.trim()
                : '';
            const result = await PlannerEmergencyService.emergencyStopPlanner(req.params.id, req.user.id, reason);

            return ResponseUtil.success(
                res,
                result,
                PlannerEmergencyController.translateOrFallback(
                    req,
                    'planner.emergency_stop_success',
                    'Emergency stop successful. Planner has been cancelled.'
                )
            );
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner is not ongoing') {
                return PlannerEmergencyController.badRequestWithFallback(
                    res,
                    req,
                    'planner.emergency_stop_requires_ongoing',
                    'Emergency stop is only available when planner is ongoing.'
                );
            }
            if (error.message === 'Emergency reason is required') {
                return PlannerEmergencyController.badRequestWithFallback(
                    res,
                    req,
                    'planner.emergency_stop_reason_required',
                    'Emergency stop reason is required.'
                );
            }

            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerEmergencyController;
