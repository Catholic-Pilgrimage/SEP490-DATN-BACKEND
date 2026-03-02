const ManagerContentService = require('../../services/manager/contentService');
const ResponseUtil = require('../../utils/response.util');
const { uploadToSupabase } = require('../../config/supabase.config');

// ===================== MEDIA =====================

/**
 * Manager: Upload 3D Model
 * POST /api/manager/content/media/3d-model
 */
exports.upload3DModel = async (req, res) => {
    try {
        const { caption } = req.body;

        if (!req.file) {
            return ResponseUtil.badRequest(res, req.__('manager.file_required'));
        }

        // Upload file buffer to Supabase Storage
        const { url } = await uploadToSupabase(req.file.buffer, req.file.originalname);

        const fileData = {
            url,
            caption
        };

        const result = await ManagerContentService.upload3DModel(req.user.id, fileData);
        return ResponseUtil.created(res, result, req.__('manager.upload_3d_model_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'File URL required') {
            return ResponseUtil.badRequest(res, req.__('manager.file_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Get Site Media
 * GET /api/manager/content/media
 * Query params: page, limit, type, status, narrative_status, is_active
 */
exports.getMedia = async (req, res) => {
    try {
        const { page, limit, type, status, narrative_status, is_active } = req.query;
        const result = await ManagerContentService.getMedia(req.user.id, {
            page, limit, type, status, narrative_status, is_active
        });
        return ResponseUtil.success(res, result, req.__('manager.get_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Media Status (Approve/Reject)
 * PATCH /api/manager/content/media/:id/status
 */
exports.updateMediaStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const result = await ManagerContentService.updateMediaStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('manager.media_approved')
            : req.__('manager.media_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('manager.media_not_found'));
        }
        if (error.message === 'Already reviewed') {
            return ResponseUtil.badRequest(res, req.__('manager.already_reviewed'));
        }
        if (error.message === 'Rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Narrative Status (Approve/Reject narrative only)
 * PATCH /api/manager/content/media/:id/narrative-status
 */
exports.updateNarrativeStatus = async (req, res) => {
    try {
        const { narrative_status, narrative_rejection_reason } = req.body;
        const result = await ManagerContentService.updateNarrativeStatus(
            req.user.id,
            req.params.id,
            narrative_status,
            narrative_rejection_reason
        );

        const message = narrative_status === 'approved'
            ? req.__('manager.narrative_approved')
            : req.__('manager.narrative_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Invalid narrative status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_narrative_status'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('manager.media_not_found'));
        }
        if (error.message === 'No narrative to review') {
            return ResponseUtil.badRequest(res, req.__('manager.no_narrative'));
        }
        if (error.message === 'Narrative rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.narrative_rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Toggle Media Active (Soft delete/Restore)
 * PATCH /api/manager/content/media/:id/is-active
 */
exports.toggleMediaActive = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_is_active'));
        }

        const result = await ManagerContentService.toggleMediaActive(req.user.id, req.params.id, is_active);

        const message = is_active
            ? req.__('manager.media_restored')
            : req.__('manager.media_deactivated');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('manager.media_not_found'));
        }
        if (error.message === 'Only approved media can be toggled') {
            return ResponseUtil.badRequest(res, req.__('manager.only_approved_toggle'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ===================== SCHEDULES =====================

/**
 * Manager: Get Site Schedules
 * GET /api/manager/content/schedules
 */
exports.getSchedules = async (req, res) => {
    try {
        const { page, limit, status, day_of_week } = req.query;
        const result = await ManagerContentService.getSchedules(req.user.id, {
            page, limit, status, day_of_week
        });
        return ResponseUtil.success(res, result, req.__('manager.get_schedules_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Schedule Status (Approve/Reject)
 * PATCH /api/manager/content/schedules/:id/status
 */
exports.updateScheduleStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const result = await ManagerContentService.updateScheduleStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('manager.schedule_approved')
            : req.__('manager.schedule_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }
        if (error.message === 'Schedule not found') {
            return ResponseUtil.notFound(res, req.__('manager.schedule_not_found'));
        }
        if (error.message === 'Already reviewed') {
            return ResponseUtil.badRequest(res, req.__('manager.already_reviewed'));
        }
        if (error.message === 'Rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Toggle Schedule Active (Soft delete/Restore)
 * PATCH /api/manager/content/schedules/:id/is-active
 */
exports.toggleScheduleActive = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_is_active'));
        }

        const result = await ManagerContentService.toggleScheduleActive(req.user.id, req.params.id, is_active);

        const message = is_active
            ? req.__('manager.schedule_restored')
            : req.__('manager.schedule_deactivated');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Schedule not found') {
            return ResponseUtil.notFound(res, req.__('manager.schedule_not_found'));
        }
        if (error.message === 'Only approved schedule can be toggled') {
            return ResponseUtil.badRequest(res, req.__('manager.only_approved_schedule_toggle'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ===================== EVENTS =====================

/**
 * Manager: Get Site Events
 */
exports.getEvents = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const result = await ManagerContentService.getEvents(req.user.id, {
            page, limit, status
        });
        return ResponseUtil.success(res, result, req.__('manager.get_events_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Event Status (Approve/Reject)
 */
exports.updateEventStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const result = await ManagerContentService.updateEventStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('manager.event_approved')
            : req.__('manager.event_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }
        if (error.message === 'Event not found') {
            return ResponseUtil.notFound(res, req.__('manager.event_not_found'));
        }
        if (error.message === 'Already reviewed') {
            return ResponseUtil.badRequest(res, req.__('manager.already_reviewed'));
        }
        if (error.message === 'Rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Toggle Event Active (Soft delete/Restore)
 */
exports.toggleEventActive = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_is_active'));
        }

        const result = await ManagerContentService.toggleEventActive(req.user.id, req.params.id, is_active);

        const message = is_active
            ? req.__('manager.event_restored')
            : req.__('manager.event_deactivated');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Event not found') {
            return ResponseUtil.notFound(res, req.__('manager.event_not_found'));
        }
        if (error.message === 'Only approved event can be toggled') {
            return ResponseUtil.badRequest(res, req.__('manager.only_approved_event_toggle'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ===================== NEARBY PLACES =====================

/**
 * Manager: Get Nearby Places
 * GET /api/manager/content/nearby-places
 */
exports.getNearbyPlaces = async (req, res) => {
    try {
        const { page, limit, category, status } = req.query;
        const result = await ManagerContentService.getNearbyPlaces(req.user.id, {
            page, limit, category, status
        });
        return ResponseUtil.success(res, result, req.__('manager.get_nearby_places_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Nearby Place Status (Approve/Reject)
 * PATCH /api/manager/content/nearby-places/:id/status
 */
exports.updateNearbyPlaceStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const result = await ManagerContentService.updateNearbyPlaceStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('manager.nearby_place_approved')
            : req.__('manager.nearby_place_rejected');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Nearby place not found') {
            return ResponseUtil.notFound(res, req.__('manager.nearby_place_not_found'));
        }
        if (error.message === 'Only pending nearby places can be reviewed') {
            return ResponseUtil.badRequest(res, req.__('manager.only_pending_nearby_place'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }
        if (error.message === 'Rejection reason is required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Toggle Nearby Place Active (Soft delete/Restore)
 * PATCH /api/manager/content/nearby-places/:id/is-active
 */
exports.toggleNearbyPlaceActive = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_is_active'));
        }

        const result = await ManagerContentService.toggleNearbyPlaceActive(req.user.id, req.params.id, is_active);

        const message = is_active
            ? req.__('manager.nearby_place_restored')
            : req.__('manager.nearby_place_deactivated');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Nearby place not found') {
            return ResponseUtil.notFound(res, req.__('manager.nearby_place_not_found'));
        }
        if (error.message === 'Only approved nearby place can be toggled') {
            return ResponseUtil.badRequest(res, req.__('manager.only_approved_nearby_place_toggle'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ===================== NARRATIVE (3D MODEL AUDIO) =====================
// Note: Manager can only view and approve narratives created by Local Guides.
// Manager cannot create/update narratives or access voice list.

/**
 * Manager: Update narrative status (approve/reject)
 * PATCH /api/manager/content/media/:id/narrative-status
 */
exports.updateNarrativeStatus = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return ResponseUtil.badRequest(res, req.__('manager.invalid_status'));
        }

        if (status === 'rejected' && !rejection_reason) {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }

        const result = await ManagerContentService.updateNarrativeStatus(
            req.user.id,
            req.params.id,
            status,
            rejection_reason
        );

        const message = status === 'approved'
            ? req.__('narrative.approved_success')
            : req.__('narrative.rejected_success');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager.no_site'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Not a 3D model') {
            return ResponseUtil.badRequest(res, req.__('narrative.only_3d_model'));
        }
        if (error.message === 'Narrative not pending') {
            return ResponseUtil.badRequest(res, req.__('narrative.not_pending'));
        }
        if (error.message === 'No narrative to review') {
            return ResponseUtil.badRequest(res, req.__('narrative.no_narrative'));
        }
        if (error.message === 'Narrative rejection reason required') {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
