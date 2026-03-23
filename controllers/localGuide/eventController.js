const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide: Create Event
 * POST /api/local-guide/events
 */
exports.createEvent = async (req, res) => {
    try {
        const bannerUrl = req.file ? req.file.path : null;
        const result = await LocalGuideService.createEvent(req.user.id, req.body, bannerUrl);
        return ResponseUtil.created(res, result, req.__('local_guide.create_event_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Local Guide has no site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get My Events
 * GET /api/local-guide/events
 */
exports.getEvents = async (req, res) => {
    try {
        const { page, limit, status, is_active } = req.query;
        const result = await LocalGuideService.getEvents(req.user.id, { page, limit, status, is_active });
        return ResponseUtil.success(res, result, req.__('local_guide.get_events_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Event
 * PUT /api/local-guide/events/:id
 */
exports.updateEvent = async (req, res) => {
    try {
        const bannerUrl = req.file ? req.file.path : null;
        const result = await LocalGuideService.updateEvent(req.user.id, req.params.id, req.body, bannerUrl);
        return ResponseUtil.success(res, result, req.__('local_guide.update_event_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Event not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.event_not_found'));
        }
        if (error.message === 'Cannot update approved event') {
            return ResponseUtil.badRequest(res, req.__('local_guide.update_approved_event_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Event
 * DELETE /api/local-guide/events/:id
 */
exports.deleteEvent = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteEvent(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_event_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Event not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.event_not_found'));
        }
        if (error.message === 'Cannot delete approved event') {
            return ResponseUtil.badRequest(res, req.__('local_guide.delete_approved_event_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Restore Event
 * PATCH /api/local-guide/events/:id/restore
 */
exports.restoreEvent = async (req, res) => {
    try {
        const result = await LocalGuideService.restoreEvent(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.restore_event_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Event not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.event_not_found'));
        }
        if (error.message === 'Cannot restore approved event') {
            return ResponseUtil.badRequest(res, req.__('local_guide.restore_approved_event_error'));
        }
        if (error.message === 'Event is already active') {
            return ResponseUtil.badRequest(res, req.__('local_guide.event_already_active'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
