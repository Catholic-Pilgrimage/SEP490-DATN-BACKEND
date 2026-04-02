const PlannerCalendarService = require('../../services/pilgrim/plannerCalendarService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class PlannerCalendarController {
    /**
     * GET /api/pilgrim/planners/:id/calendar-sync
     * Get planner data for calendar sync (expo-calendar)
     */
    static async getCalendarSync(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerCalendarService.getPlannerForCalendarSync(
                req.params.id, 
                req.user.id
            );

            return ResponseUtil.success(res, result, req.__('calendar_sync.success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner must have start_date and end_date for calendar sync') {
                return ResponseUtil.badRequest(res, req.__('calendar_sync.missing_dates'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerCalendarController;
