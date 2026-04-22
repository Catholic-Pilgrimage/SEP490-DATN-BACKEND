const { adminSiteService } = require('../../services/admin');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

// Helper: Parse JSON fields
const parseJsonFields = (req, res) => {
    if (req.body.opening_hours && typeof req.body.opening_hours === 'string') {
        try {
            req.body.opening_hours = JSON.parse(req.body.opening_hours);
        } catch (e) {
            return ResponseUtil.badRequest(res, req.__('validation.invalid_json'));
        }
    }
    if (req.body.contact_info && typeof req.body.contact_info === 'string') {
        try {
            req.body.contact_info = JSON.parse(req.body.contact_info);
        } catch (e) {
            return ResponseUtil.badRequest(res, req.__('validation.invalid_json'));
        }
    }
    if (req.file) {
        req.body.cover_image = req.file.path;
    }
    return null;
};

// Admin: Create placeholder site
exports.createSite = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const parseError = parseJsonFields(req, res);
        if (parseError) return parseError;

        const result = await adminSiteService.createSite(req.body, req.user.id);
        return ResponseUtil.created(res, result, req.__('site.create_success'));
    } catch (error) {
        if (error.message === 'name, province, region, type are required') {
            return ResponseUtil.badRequest(res, req.__('validation.failed'));
        }
        if (error.message === 'Site code already exists') {
            return ResponseUtil.conflict(res, req.__('site.already_exists'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get all sites
exports.getSites = async (req, res) => {
    try {
        const { page, limit, region, type, is_active, search } = req.query;
        const result = await adminSiteService.getSites({ page, limit, region, type, is_active, search });
        return ResponseUtil.success(res, result, req.__('site.list_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get site by ID
exports.getSiteById = async (req, res) => {
    try {
        const result = await adminSiteService.getSiteById(req.params.id);
        return ResponseUtil.success(res, result, req.__('site.get_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Update site
exports.updateSite = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const parseError = parseJsonFields(req, res);
        if (parseError) return parseError;

        const result = await adminSiteService.updateSite(req.params.id, req.body);
        return ResponseUtil.success(res, result, req.__('site.update_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        if (error.message === 'Site already exists') {
            return ResponseUtil.conflict(res, req.__('site.already_exists'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Soft delete site
exports.deleteSite = async (req, res) => {
    try {
        const result = await adminSiteService.deleteSite(req.params.id);
        return ResponseUtil.success(res, result, req.__('site.delete_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        if (error.message === 'Site already deleted') {
            return ResponseUtil.badRequest(res, req.__('site.already_deleted'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Restore site
exports.restoreSite = async (req, res) => {
    try {
        const result = await adminSiteService.restoreSite(req.params.id);
        return ResponseUtil.success(res, result, req.__('site.restore_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        if (error.message === 'Site is not deleted') {
            return ResponseUtil.badRequest(res, req.__('site.not_deleted'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get local guides of a site
exports.getSiteGuides = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await adminSiteService.getSiteGuides(req.params.siteId, { page, limit });
        return ResponseUtil.success(res, result, req.__('site.get_guides_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get shift submissions of a site
exports.getSiteShifts = async (req, res) => {
    try {
        const { page, limit, status } = req.query;
        const result = await adminSiteService.getSiteShifts(req.params.siteId, { page, limit, status });
        return ResponseUtil.success(res, result, req.__('site.get_shifts_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get media of a site
exports.getSiteMedia = async (req, res) => {
    try {
        const { page, limit, status, type, is_active } = req.query;
        const result = await adminSiteService.getSiteMedia(req.params.siteId, { page, limit, status, type, is_active });
        return ResponseUtil.success(res, result, req.__('site.get_media_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get schedules of a site
exports.getSiteSchedules = async (req, res) => {
    try {
        const { page, limit, status, is_active } = req.query;
        const result = await adminSiteService.getSiteSchedules(req.params.siteId, { page, limit, status, is_active });
        return ResponseUtil.success(res, result, req.__('site.get_schedules_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get events of a site
exports.getSiteEvents = async (req, res) => {
    try {
        const { page, limit, status, is_active, time_state } = req.query;
        const result = await adminSiteService.getSiteEvents(req.params.siteId, { page, limit, status, is_active, time_state });
        return ResponseUtil.success(res, result, req.__('site.get_events_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Admin: Get nearby places of a site
exports.getSiteNearbyPlaces = async (req, res) => {
    try {
        const { page, limit, status, category, is_active } = req.query;
        const result = await adminSiteService.getSiteNearbyPlaces(req.params.siteId, { page, limit, status, category, is_active });
        return ResponseUtil.success(res, result, req.__('site.get_nearby_places_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
