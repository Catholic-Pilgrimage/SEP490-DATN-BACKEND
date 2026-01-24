const LocalGuideService = require('../services/localGuideService');
const ResponseUtil = require('../utils/response.util');

/**
 * Local Guide: Get my site details
 * GET /api/local-guide/site
 */
exports.getMySite = async (req, res) => {
    try {
        const result = await LocalGuideService.getMySite(req.user.id);

        return ResponseUtil.success(res, result, req.__('local_guide.site_success'));
    } catch (error) {
        if (error.message === 'User not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Only local guides can access this') {
            return ResponseUtil.forbidden(res, req.__('local_guide.only_local_guide'));
        }
        if (error.message === 'Local Guide has no site assigned') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Upload Site Media
 * POST /api/local-guide/media
 * - File upload (multipart/form-data): image, video, panorama
 * - YouTube URL (application/json): video link
 */
exports.uploadMedia = async (req, res) => {
    try {
        const { type, caption, url } = req.body;

        // Validate type
        if (!type || !['image', 'video', 'panorama'].includes(type)) {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
        }

        let mediaUrl;


        if (req.file) {
            mediaUrl = req.file.path;
        }

        else if (url && type === 'video') {
            mediaUrl = url;
        }

        else {
            return ResponseUtil.badRequest(res, req.__('local_guide.file_or_url_required'));
        }

        const mediaData = {
            url: mediaUrl,
            type,
            caption
        };

        const result = await LocalGuideService.uploadMedia(req.user.id, mediaData);
        return ResponseUtil.created(res, result, req.__('local_guide.upload_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Local Guide has no site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        if (error.message === 'Invalid media type') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
        }
        if (error.message === 'Invalid YouTube URL') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_youtube_url'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get Site Media with filter & pagination
 * GET /api/local-guide/media
 */
exports.getSiteMedia = async (req, res) => {
    try {
        const { page, limit, type, status } = req.query;
        const result = await LocalGuideService.getSiteMedia(req.user.id, {
            page, limit, type, status
        });
        return ResponseUtil.success(res, result, req.__('local_guide.get_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Site Media (Only pending)
 * DELETE /api/local-guide/media/:id
 */
exports.deleteMedia = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteMedia(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Cannot delete approved media') {
            return ResponseUtil.badRequest(res, req.__('local_guide.delete_approved_media_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Site Media (Only pending)
 * PUT /api/local-guide/media/:id
 */
exports.updateMedia = async (req, res) => {
    try {
        const { type, caption, url } = req.body;

        const updateData = { caption };

        if (type) {
            if (!['image', 'video', 'panorama'].includes(type)) {
                return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
            }
            updateData.type = type;
        }


        if (req.file) {
            updateData.url = req.file.path;
        }

        else if (url) {
            updateData.url = url;
        }

        const result = await LocalGuideService.updateMedia(req.user.id, req.params.id, updateData);
        return ResponseUtil.success(res, result, req.__('local_guide.update_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Cannot update approved media') {
            return ResponseUtil.badRequest(res, req.__('local_guide.update_approved_error'));
        }
        if (error.message === 'Invalid YouTube URL') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_youtube_url'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};


// ========================
// MASS SCHEDULE CONTROLLERS
// ========================

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

// ===================== SHIFT SUBMISSIONS =====================

/**
 * Local Guide: Create Shift Submission
 * POST /api/local-guide/shift-submissions
 */
exports.createSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.createSubmission(req.user.id, req.body);

        if (result.errors && result.errors.length > 0) {
            return ResponseUtil.success(res, result, req.__('local_guide.create_submission_partial'));
        }

        return ResponseUtil.created(res, result, req.__('local_guide.create_submission_success'));
    } catch (error) {
        if (error.message === 'Local Guide not assigned to any site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        if (error.message.includes('pending submission')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.pending_submission_exists'));
        }
        if (error.message.includes('Change reason is required')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.change_reason_required'));
        }
        if (error.message === 'No valid shifts provided') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_valid_shifts'));
        }
        if (error.message.includes('already have an approved schedule')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.approved_submission_exists'));
        }
        if (error.message.includes('Shift conflicts detected') || error.message.includes('overlaps with another Local Guide')) {
            // Parse conflict details from error message
            let conflictDetails = null;
            try {
                const jsonMatch = error.message.match(/\[.*\]/);
                if (jsonMatch) {
                    conflictDetails = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                // If parsing fails, just use the raw message
            }

            return ResponseUtil.conflict(res, req.__('local_guide.shift_conflict'), conflictDetails);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get My Submissions
 * GET /api/local-guide/shift-submissions
 */
exports.getSubmissions = async (req, res) => {
    try {
        const { status, week_start_date } = req.query;
        const result = await LocalGuideService.getMySubmissions(req.user.id, {
            status,
            week_start_date
        });
        return ResponseUtil.success(res, result, req.__('local_guide.get_submissions_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get Submission Detail
 * GET /api/local-guide/shift-submissions/:id
 */
exports.getSubmissionDetail = async (req, res) => {
    try {
        const result = await LocalGuideService.getSubmissionDetail(req.user.id, req.params.id);
        return ResponseUtil.success(res, result);
    } catch (error) {
        if (error.message === 'Submission not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Submission (pending/rejected only)
 * PUT /api/local-guide/shift-submissions/:id
 */
exports.updateSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.updateSubmission(req.user.id, req.params.id, req.body);
        return ResponseUtil.success(res, result, req.__('local_guide.update_submission_success'));
    } catch (error) {
        if (error.message === 'Submission not found or already approved') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found_or_approved'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Submission (pending only)
 * DELETE /api/local-guide/shift-submissions/:id
 */
exports.deleteSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteSubmission(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_submission_success'));
    } catch (error) {
        if (error.message === 'Submission not found or not pending') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found_or_not_pending'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};


/**
 * Local Guide: Get Site Schedule (calendar view)
 * GET /api/local-guide/site-schedule
 */
exports.getSiteSchedule = async (req, res) => {
    try {
        const { week_start_date } = req.query;

        if (!week_start_date) {
            return ResponseUtil.badRequest(res, req.__('local_guide.week_start_date_required'));
        }

        const result = await LocalGuideService.getSiteSchedule(req.user.id, week_start_date);
        return ResponseUtil.success(res, result, req.__('local_guide.get_site_schedule_success'));
    } catch (error) {
        if (error.message === 'Local Guide not assigned to any site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};


// ========================
// EVENT 
// ========================

/**
 * Local Guide: Create Event
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
 */
exports.getEvents = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const result = await LocalGuideService.getEvents(req.user.id, { page, limit, status });
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
