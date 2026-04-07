const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide: Create Mass Schedule
 * POST /api/local-guide/schedules
 */
exports.createSchedule = async (req, res) => {
    try {
        const { days_of_week, time, note } = req.body;

        if (!time) {
            return ResponseUtil.badRequest(res, req.__('local_guide.time_required'));
        }

        if (!days_of_week || !Array.isArray(days_of_week) || days_of_week.length === 0) {
            return ResponseUtil.badRequest(res, req.__('local_guide.days_of_week_required'));
        }

        const result = await LocalGuideService.createSchedule(req.user.id, {
            days_of_week,
            time,
            note
        });

        return ResponseUtil.created(res, result, req.__('local_guide.create_schedule_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Local Guide has no site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        if (error.message === 'days_of_week must be a non-empty array' ||
            error.message === 'Each day must be between 0 and 6') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_days_of_week'));
        }
        if (error.message === 'Schedule time outside opening hours') {
            return ResponseUtil.badRequest(res, req.__('local_guide.schedule_outside_opening_hours', error.meta));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get MY Schedules with filter & pagination
 * GET /api/local-guide/schedules
 */
exports.getSchedules = async (req, res) => {
    try {
        const { page, limit, status, day_of_week } = req.query;
        const result = await LocalGuideService.getSchedules(req.user.id, {
            page, limit, status, day_of_week
        });
        return ResponseUtil.success(res, result, req.__('local_guide.get_schedules_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Schedule (Only own + pending/rejected)
 * PUT /api/local-guide/schedules/:id
 */
exports.updateSchedule = async (req, res) => {
    try {
        const { days_of_week, time, note } = req.body;

        const result = await LocalGuideService.updateSchedule(req.user.id, req.params.id, {
            days_of_week,
            time,
            note
        });

        return ResponseUtil.success(res, result, req.__('local_guide.update_schedule_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Schedule not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.schedule_not_found'));
        }
        if (error.message === 'Cannot update approved schedule') {
            return ResponseUtil.badRequest(res, req.__('local_guide.update_approved_schedule_error'));
        }
        if (error.message === 'days_of_week must be a non-empty array' ||
            error.message === 'Each day must be between 0 and 6') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_days_of_week'));
        }
        if (error.message === 'Schedule time outside opening hours') {
            return ResponseUtil.badRequest(res, req.__('local_guide.schedule_outside_opening_hours', error.meta));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Schedule (Only own + pending/rejected)
 * DELETE /api/local-guide/schedules/:id
 */
exports.deleteSchedule = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteSchedule(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_schedule_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Schedule not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.schedule_not_found'));
        }
        if (error.message === 'Cannot delete approved schedule') {
            return ResponseUtil.badRequest(res, req.__('local_guide.delete_approved_schedule_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Restore Schedule
 * PATCH /api/local-guide/schedules/:id/restore
 */
exports.restoreSchedule = async (req, res) => {
    try {
        const result = await LocalGuideService.restoreSchedule(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.restore_schedule_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Schedule not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.schedule_not_found'));
        }
        if (error.message === 'Cannot restore approved schedule') {
            return ResponseUtil.badRequest(res, req.__('local_guide.restore_approved_schedule_error'));
        }
        if (error.message === 'Schedule is already active') {
            return ResponseUtil.badRequest(res, req.__('local_guide.schedule_already_active'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
