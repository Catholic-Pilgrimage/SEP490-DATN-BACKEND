const SiteService = require('../services/siteService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

// Create new site (Admin only)
exports.createSite = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }


    if (req.body.opening_hours && typeof req.body.opening_hours === 'string') {
      try {
        req.body.opening_hours = JSON.parse(req.body.opening_hours);
      } catch (e) {
        return ResponseUtil.badRequest(res, 'Invalid opening_hours JSON format');
      }
    }

    if (req.body.contact_info && typeof req.body.contact_info === 'string') {
      try {
        req.body.contact_info = JSON.parse(req.body.contact_info);
      } catch (e) {
        return ResponseUtil.badRequest(res, 'Invalid contact_info JSON format');
      }
    }


    if (req.file) {
      req.body.cover_image = req.file.path;
    }

    const result = await SiteService.createSite(req.body, req.user.id);
    return ResponseUtil.created(res, result, req.__('site.create_success'));
  } catch (error) {
    if (error.message === 'Site already exists') {
      return ResponseUtil.conflict(res, req.__('site.already_exists'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Get all sites with pagination (Admin)
exports.getSites = async (req, res) => {
  try {
    const { page, limit, region, type, status, is_active, search } = req.query;

    const result = await SiteService.getSites({
      page,
      limit,
      region,
      type,
      status,
      is_active,
      search
    });

    return ResponseUtil.success(res, result, req.__('site.list_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Get site by ID (Admin)
exports.getSiteById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await SiteService.getSiteById(id);

    return ResponseUtil.success(res, result, req.__('site.get_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Soft delete site (Admin)
exports.deleteSite = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await SiteService.deleteSite(id);

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

// Restore soft deleted site (Admin)
exports.restoreSite = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await SiteService.restoreSite(id);

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

// Update site (Admin)
exports.updateSite = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { id } = req.params;

    // Parse JSON strings from form-data
    if (req.body.opening_hours && typeof req.body.opening_hours === 'string') {
      try {
        req.body.opening_hours = JSON.parse(req.body.opening_hours);
      } catch (e) {
        return ResponseUtil.badRequest(res, 'Invalid opening_hours JSON format');
      }
    }

    if (req.body.contact_info && typeof req.body.contact_info === 'string') {
      try {
        req.body.contact_info = JSON.parse(req.body.contact_info);
      } catch (e) {
        return ResponseUtil.badRequest(res, 'Invalid contact_info JSON format');
      }
    }

    // Get uploaded image URL from Cloudinary
    if (req.file) {
      req.body.cover_image = req.file.path;
    }

    const result = await SiteService.updateSite(id, req.body);

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
