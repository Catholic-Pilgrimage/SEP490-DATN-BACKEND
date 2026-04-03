const PlannerService = require('../services/plannerService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

class PlannerController {
    static localizePlannerResult(req, result) {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            return result;
        }

        const localizedResult = { ...result };

        if (localizedResult.messageKey) {
            localizedResult.message = req.__(localizedResult.messageKey, localizedResult.messageParams || {});
            delete localizedResult.messageKey;
            delete localizedResult.messageParams;
        }

        if (!localizedResult.warning || typeof localizedResult.warning === 'string') {
            return localizedResult;
        }

        if (localizedResult.warning.code === 'event_time_window') {
            localizedResult.warning = req.__('planner.event_time_warning', {
                time: localizedResult.warning.time || '',
                eventName: localizedResult.warning.eventName || 'Event',
                startTime: localizedResult.warning.startTime || '--:--',
                endTime: localizedResult.warning.endTime || '--:--'
            });
        }

        return localizedResult;
    }

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
            if (error.message === 'Ngày bắt đầu kế hoạch phải từ ngày mai trở đi') {
                return ResponseUtil.badRequest(res, req.__('planner.start_date_from_tomorrow'));
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
            if (error.message === 'Group lead time error') {
                return ResponseUtil.badRequest(res, req.__('planner.group_lead_time_error'));
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
            if (error.message === 'Ngày bắt đầu kế hoạch phải từ ngày mai trở đi') {
                return ResponseUtil.badRequest(res, req.__('planner.start_date_from_tomorrow'));
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
            if (error.message === 'Cannot reduce capacity below committed slots') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_reduce_capacity_below_committed', { count: error.requiredSlots || '?' }));
            }
            if (error.message === 'Cannot make planner incomplete after sharing') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_break_schedule_after_sharing'));
            }
            if (error.message === 'Solo planner cannot have a deposit amount') {
                return ResponseUtil.badRequest(res, req.__('planner.solo_deposit_not_allowed'));
            }
            if (error.message === 'Solo planner cannot have a penalty percentage') {
                return ResponseUtil.badRequest(res, req.__('planner.solo_penalty_not_allowed'));
            }
            if (error.message === 'Cannot update completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_completed'));
            }
            if (error.message === 'Cannot update cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_cancelled'));
            }
            if (error.message === 'Planner dates can only be set during creation') {
                return ResponseUtil.badRequest(res, req.__('planner.dates_only_on_create'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            if (error.message === 'Only group journeys can schedule an edit lock') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_group'));
            }
            if (error.message === 'Edit lock requires complete schedule') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_complete_schedule'));
            }
            if (error.message === 'Edit lock requires first invite') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_first_invite'));
            }
            if (error.message === 'Edit lock requires discussion period') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_discussion_period'));
            }
            if (error.message === 'Edit lock must be after discussion period') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_must_be_after_discussion_period'));
            }
            if (error.message === 'Edit lock must be on or before planner lock time') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_must_be_before_planner_lock'));
            }
            if (error.message === 'Invalid edit lock time') {
                return ResponseUtil.badRequest(res, req.__('validation.failed'));
            }
            if (error.message === 'Group lead time error') {
                return ResponseUtil.badRequest(res, req.__('planner.group_lead_time_error'));
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

            let result = await PlannerService.deletePlanner(req.params.id, req.user.id);
            result = PlannerController.localizePlannerResult(req, result);
            return ResponseUtil.success(res, result, req.__('planner.delete_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Cannot delete ongoing journey') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_ongoing'));
            }
            if (error.message === 'Cannot delete completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_completed'));
            }
            if (error.message === 'Cannot delete cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_cancelled'));
            }
            if (error.message === 'Cannot delete shared group planner') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_shared_group'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
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

            let result = await PlannerService.addPlannerItem(req.params.id, req.user?.id, req.body);
            result = PlannerController.localizePlannerResult(req, result);

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
            if (error.message === 'Group planner patron saint mismatch') {
                return ResponseUtil.badRequest(res, req.__('planner.group_patron_saint_mismatch', {
                    anchorPatronSaint: error.anchorPatronSaint || '',
                    anchorSiteName: error.anchorSiteName || '',
                    currentSiteName: error.currentSiteName || '',
                    currentPatronSaint: error.currentPatronSaint || ''
                }));
            }
            if (error.message === 'Site not found') {
                return ResponseUtil.notFound(res, req.__('planner.site_not_found'));
            }
            if (error.message === 'Event not found') {
                return ResponseUtil.notFound(res, req.__('planner.event_not_found'));
            }
            if (error.message === 'Event is not available') {
                return ResponseUtil.badRequest(res, req.__('planner.event_not_available'));
            }
            if (error.message.includes('Invalid day number')) {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_leg_number_range', { max: error.message.match(/\d+/)?.[0] || '?' }));
            }
            if (error.message === 'Day number must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_leg_number_min'));
            }
            if (error.message === 'Cannot add item to completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_add_completed'));
            }
            if (error.message === 'Cannot add item to cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_add_cancelled'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            if (error.message === 'Cannot make planner incomplete after sharing') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_break_schedule_after_sharing'));
            }
            if (error.message === 'Consecutive site not allowed') {
                return ResponseUtil.badRequest(res, req.__('planner.consecutive_site_same_day', { day: req.body.leg_number || '?' }));
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
                return ResponseUtil.badRequest(res, req.__('planner.estimated_time_required'));
            }
            if (error.message === 'Rest duration is required') {
                return ResponseUtil.badRequest(res, req.__('planner.rest_duration_required'));
            }
            if (error.message === 'Event time after end') {
                return ResponseUtil.badRequest(res, req.__('planner.event_time_after_end', {
                    time: error.time || req.body.estimated_time || '',
                    eventName: error.eventName || 'Event',
                    endTime: error.endTime || '--:--'
                }));
            }
            if (error.message.startsWith('Missing preceding days:')) {
                const parts = error.message.replace('Missing preceding days: ', '').split(', missing days ');
                const day = parts[0].replace('current day ', '');
                const missingDays = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.missing_preceding_days', { day, missingDays }));
            }
            if (error.message.startsWith('Invalid arrival time:')) {
                const parts = error.message.replace('Invalid arrival time: ', '').split(', departure: ');
                const time = parts[0];
                const departureTime = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.invalid_arrival_time', { time, departureTime }));
            }
            if (error.message.startsWith('Arrival time past midnight:')) {
                const parts = error.message.replace('Arrival time past midnight: ', '').split(', ');
                const departureTime = parts[0].replace('departure ', '');
                const travelTime = parts[1].replace('travel ', '');
                const day = parts[2].replace('day ', '');
                return ResponseUtil.badRequest(res, req.__('planner.arrival_time_next_day', { departureTime, travelTime, day }));
            }
            if (error.message.startsWith('Invalid arrival time suggested:')) {
                const parts = error.message.replace('Invalid arrival time suggested: ', '').split(', ');
                const time = parts[0];
                const departureTime = parts[1].replace('departure ', '');
                const travelTime = parts[2].replace('travel ', '');
                const suggestedTime = parts[3].replace('suggested ', '');
                return ResponseUtil.badRequest(res, req.__('planner.arrival_time_suggested', { time, departureTime, travelTime, suggestedTime }));
            }
            if (error.message.startsWith('Duplicate time in day:')) {
                const parts = error.message.replace('Duplicate time in day: ', '').split(', ');
                const time = parts[0];
                const day = parts[1].replace('day ', '');
                return ResponseUtil.badRequest(res, req.__('planner.duplicate_time_in_day', { time, day }));
            }
            if (error.message.startsWith('Site is closed on')) {
                const day = error.message.replace('Site is closed on ', '').replace('s', '');
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_on_day', { day }));
            }
            if (error.message.startsWith('Site is closed at')) {
                const parts = error.message.replace('Site is closed at ', '').split('. Opening hours: ');
                const time = parts[0];
                const hours = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_at', { time, hours }));
            }
            if (error.message.startsWith('Consecutive site same day:')) {
                const day = error.message.replace('Consecutive site same day: day ', '');
                return ResponseUtil.badRequest(res, req.__('planner.consecutive_site_same_day', { day }));
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

            let result = await PlannerService.deletePlannerItem(
                req.params.id,
                req.user.id,
                req.params.itemId
            );
            result = PlannerController.localizePlannerResult(req, result);

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
            if (error.message === 'Cannot delete ongoing journey') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_ongoing'));
            }
            if (error.message === 'Cannot delete completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_completed'));
            }
            if (error.message === 'Cannot delete cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_cancelled'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            if (error.message === 'Cannot delete visited site') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_visited'));
            }
            if (error.message === 'Cannot delete skipped site') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_skipped'));
            }
            if (error.message === 'Cannot make planner incomplete after sharing') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_break_schedule_after_sharing'));
            }
            if (error.message.startsWith('Cannot delete')) {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_processed'));
            }
            if (error.message.startsWith('Cannot delete last item gap:')) {
                const parts = error.message.replace('Cannot delete last item gap: ', '').split(', ');
                const day = parts[0].replace('day ', '');
                const higherDay = parts[1].replace('higherDay ', '');
                return ResponseUtil.badRequest(res, req.__('planner.cannot_delete_last_item_gap', { day, higherDay }));
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

            let result = await PlannerService.updatePlannerItem(
                req.params.id,
                req.user?.id,
                req.params.itemId,
                req.body
            );
            result = PlannerController.localizePlannerResult(req, result);

            if (result.warning) {
                return ResponseUtil.success(res, result, req.__('planner.item_update_success_with_warning'));
            }

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
            if (error.message.startsWith('Site is closed on')) {
                const day = error.message.replace('Site is closed on ', '').replace('s', '');
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_on_day', { day }));
            }
            if (error.message.startsWith('Site is closed at')) {
                const parts = error.message.replace('Site is closed at ', '').split('. Opening hours: ');
                const time = parts[0];
                const hours = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_at', { time, hours }));
            }
            if (error.message === 'Cannot update completed plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_completed'));
            }
            if (error.message === 'Cannot update cancelled plan') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_cancelled'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            if (error.message === 'Cannot update visited site') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_visited'));
            }
            if (error.message === 'Cannot update skipped site') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_update_skipped'));
            }
            if (error.message === 'Event time after end') {
                return ResponseUtil.badRequest(res, req.__('planner.event_time_after_end', {
                    time: error.time || req.body.estimated_time || '',
                    eventName: error.eventName || 'Event',
                    endTime: error.endTime || '--:--'
                }));
            }

            if (error.message.startsWith('Invalid arrival time:')) {
                const parts = error.message.replace('Invalid arrival time: ', '').split(', departure: ');
                const time = parts[0];
                const departureTime = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.invalid_arrival_time', { time, departureTime }));
            }
            if (error.message.startsWith('Arrival time past midnight:')) {
                const parts = error.message.replace('Arrival time past midnight: ', '').split(', ');
                const departureTime = parts[0].replace('departure ', '');
                const travelTime = parts[1].replace('travel ', '');
                const day = parts[2].replace('day ', '');
                return ResponseUtil.badRequest(res, req.__('planner.arrival_time_next_day', { departureTime, travelTime, day }));
            }
            if (error.message.startsWith('Invalid arrival time suggested:')) {
                const parts = error.message.replace('Invalid arrival time suggested: ', '').split(', ');
                const time = parts[0];
                const departureTime = parts[1].replace('departure ', '');
                const travelTime = parts[2].replace('travel ', '');
                const suggestedTime = parts[3].replace('suggested ', '');
                return ResponseUtil.badRequest(res, req.__('planner.arrival_time_suggested', { time, departureTime, travelTime, suggestedTime }));
            }
            if (error.message.startsWith('Duplicate time in day:')) {
                const parts = error.message.replace('Duplicate time in day: ', '').split(', ');
                const time = parts[0];
                const day = parts[1].replace('day ', '');
                return ResponseUtil.badRequest(res, req.__('planner.duplicate_time_in_day', { time, day }));
            }

            if (error.message.startsWith('Site is closed on')) {
                const day = error.message.replace('Site is closed on ', '').replace('s', '');
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_on_day', { day }));
            }
            if (error.message.startsWith('Site is closed at')) {
                const parts = error.message.replace('Site is closed at ', '').split('. Opening hours: ');
                const time = parts[0];
                const hours = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.site_closed_at', { time, hours }));
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
            const message = result.status === 'cancelled'
                ? req.__('planner.cancelled_zero_visited')
                : req.__('planner.complete_success');

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message.startsWith('Incomplete schedule:')) {
                const parts = error.message.replace('Incomplete schedule: ', '').split(', ');
                const missingDays = parts[0].replace('missing days ', '');
                const totalDays = parts[1].replace('total days ', '');
                return ResponseUtil.badRequest(res, req.__('planner.incomplete_schedule', { missingDays, totalDays }));
            }
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner is not ongoing') {
                return ResponseUtil.badRequest(res, req.__('planner.not_ongoing'));
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
            return ResponseUtil.success(res, result, req.__('planner.start_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Planner is not in planning status') {
                return ResponseUtil.badRequest(res, req.__('planner.not_planning') || 'Trips can only be started when in planning status');
            }
            if (error.message === 'Planner must have start_date and end_date to start') {
                return ResponseUtil.badRequest(res, req.__('planner.missing_dates') || 'Planner must have start date and end date to start');
            }
            if (error.message === 'Group trip requires at least 2 joined members') {
                return ResponseUtil.badRequest(res, req.__('planner.group_requires_two_joined'));
            }
            if (error.message === 'Group planner must be edit locked before locking') {
                return ResponseUtil.badRequest(res, req.__('planner.group_edit_lock_required_before_lock'));
            }
            if (error.message === 'Planner must be locked before starting' || error.message === 'Planner must be fully locked before starting group trip') {
                return ResponseUtil.badRequest(res, req.__('planner.start_requires_lock'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id/status - Update planner status (lock/start/complete/cancel)
     * Body: { status: 'locked' | 'ongoing' | 'completed' | 'cancelled' }
     */
    static async updatePlannerStatus(req, res) {
        try {
            const { status } = req.body;

            // Validate status
            const validStatuses = ['locked', 'ongoing', 'completed', 'cancelled'];
            if (!status || !validStatuses.includes(status)) {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_status_options', { options: validStatuses.join(', ') }));
            }

            const result = await PlannerService.updatePlannerStatus(req.params.id, req.user.id, status);

            // Customize message based on status (map results to correct messages)
            const message = status === 'locked'
                ? req.__('planner.manual_lock_success')
                : status === 'ongoing'
                ? req.__('planner.start_success')
                : result.status === 'completed'
                    ? req.__('planner.complete_success')
                    : result.status === 'cancelled'
                        ? req.__('planner.cancelled_zero_visited')
                        : req.__('planner.status_update_success');

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message.startsWith('Cannot transition status:')) {
                const parts = error.message.replace('Cannot transition status: from ', '').split(' to ');
                const from = parts[0];
                const to = parts[1];
                return ResponseUtil.badRequest(res, req.__('planner.cannot_transition_status', { from, to }));
            }
            if (error.message.startsWith('Incomplete schedule:')) {
                const parts = error.message.replace('Incomplete schedule: ', '').split(', ');
                const missingDays = parts[0].replace('missing days ', '');
                const totalDays = parts[1].replace('total days ', '');
                return ResponseUtil.badRequest(res, req.__('planner.incomplete_schedule', { missingDays, totalDays }));
            }
            if (error.message.startsWith('Plan cancelled:') || error.message.includes('0 sites visited')) {
                return ResponseUtil.badRequest(res, req.__('planner.cancelled_zero_visited'));
            }
            if (error.message.startsWith('Minimum check-in required:') || error.message.includes('0 sites visited')) {
                return ResponseUtil.badRequest(res, req.__('planner.min_visited_required'));
            }
            if (error.message === 'Planner must have start_date and end_date to start') {
                return ResponseUtil.badRequest(res, req.__('planner.missing_dates'));
            }
            if (error.message === 'Group trip requires at least 2 joined members') {
                return ResponseUtil.badRequest(res, req.__('planner.group_requires_two_joined'));
            }
            if (error.message === 'Group planner must be edit locked before locking') {
                return ResponseUtil.badRequest(res, req.__('planner.group_edit_lock_required_before_lock'));
            }
            if (error.message === 'Planner must be locked before starting' || error.message === 'Planner must be fully locked before starting group trip') {
                return ResponseUtil.badRequest(res, req.__('planner.start_requires_lock'));
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
            return ResponseUtil.success(res, result, req.__('planner.get_progress_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden' || error.message.includes('permission')) {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
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
            return ResponseUtil.success(res, result, req.__('planner.get_transactions_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/share - Share journey to community post
     */
    static async shareToPost(req, res) {
        try {
            const result = await PlannerService.sharePlannerToPost(req.user.id, req.params.id);
            return ResponseUtil.created(res, result, req.__('planner.share_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'You can only share your own planners') {
                return ResponseUtil.forbidden(res, req.__('planner.share_only_owner'));
            }
            if (error.message === 'You can only share a completed journey') {
                return ResponseUtil.badRequest(res, req.__('planner.share_only_completed'));
            }
            if (error.message === 'This journey has already been shared to the community') {
                return ResponseUtil.badRequest(res, req.__('planner.already_shared_to_community'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id/lock - Manually toggle planner lock
     */
    static async toggleLock(req, res) {
        try {
            const { is_locked } = req.body;
            if (is_locked === undefined) {
                return ResponseUtil.badRequest(res, req.__('planner.is_locked_required'));
            }

            const normalizedLockValue = typeof is_locked === 'boolean'
                ? is_locked
                : String(is_locked).toLowerCase() === 'true';
            const result = await PlannerService.togglePlannerLock(req.params.id, req.user.id, normalizedLockValue);
            
            const messageKey = normalizedLockValue ? 'planner.manual_lock_success' : 'planner.manual_unlock_success';
            return ResponseUtil.success(res, result, req.__(messageKey));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Only group journeys can be locked') {
                return ResponseUtil.badRequest(res, req.__('planner.only_group_can_lock'));
            }
            if (error.message === 'Planner is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_modify_locked'));
            }
            if (error.message === 'Edit lock requires complete schedule') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_complete_schedule'));
            }
            if (error.message === 'Edit lock requires first invite') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_first_invite'));
            }
            if (error.message === 'Edit lock requires discussion period') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_requires_discussion_period'));
            }
            if (error.message === 'Edit lock must be after discussion period') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_must_be_after_discussion_period'));
            }
            if (error.message === 'Edit lock must be on or before planner lock time') {
                return ResponseUtil.badRequest(res, req.__('planner.edit_lock_must_be_before_planner_lock'));
            }
            if (error.message === 'Cannot unlock once the journey is locked') {
                return ResponseUtil.badRequest(res, req.__('planner.cannot_unlock_once_locked'));
            }

            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerController;
