const { ManagerSiteService } = require('../../services/manager');
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

// Manager: Create site
exports.createManagerSite = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const parseError = parseJsonFields(req, res);
        if (parseError) return parseError;

        const result = await ManagerSiteService.createManagerSite(req.user.id, req.body);
        return ResponseUtil.created(res, result, req.__('manager_site.create_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Only managers can create sites') {
            return ResponseUtil.forbidden(res, req.__('manager_site.only_manager'));
        }
        if (error.message === 'Manager already has a site') {
            return ResponseUtil.conflict(res, req.__('manager_site.already_has_site'));
        }
        if (error.message === 'Site name is required') {
            return ResponseUtil.badRequest(res, req.__('manager_site.name_required'));
        }
        if (error.message === 'Province is required') {
            return ResponseUtil.badRequest(res, req.__('manager_site.province_required'));
        }
        if (error.message === 'Site already exists in this province') {
            return ResponseUtil.conflict(res, req.__('manager_site.site_exists'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Manager: Get my site
exports.getManagerSite = async (req, res) => {
    try {
        const result = await ManagerSiteService.getManagerSite(req.user.id);
        return ResponseUtil.success(res, result, req.__('manager_site.get_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.notFound(res, req.__('manager_site.no_site'));
        }
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Manager: Update my site
exports.updateManagerSite = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const parseError = parseJsonFields(req, res);
        if (parseError) return parseError;

        const result = await ManagerSiteService.updateManagerSite(req.user.id, req.body);
        return ResponseUtil.success(res, result, req.__('manager_site.update_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.notFound(res, req.__('manager_site.no_site'));
        }
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        if (error.message === 'Site already exists') {
            return ResponseUtil.conflict(res, req.__('site.already_exists'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
