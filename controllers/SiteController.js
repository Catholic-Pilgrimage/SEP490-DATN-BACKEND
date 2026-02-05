const SiteService = require('../services/siteService');
const AdminSiteService = require('../services/admin/adminSiteService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

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

    const result = await SiteService.createManagerSite(req.user.id, req.body);
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
    const result = await SiteService.getManagerSite(req.user.id);
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

    const result = await SiteService.updateManagerSite(req.user.id, req.body);
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



// Admin: Get all sites
exports.getSites = async (req, res) => {
  try {
    const { page, limit, region, type, is_active, search } = req.query;
    const result = await AdminSiteService.getSites({ page, limit, region, type, is_active, search });
    return ResponseUtil.success(res, result, req.__('site.list_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Admin: Get site by ID
exports.getSiteById = async (req, res) => {
  try {
    const result = await AdminSiteService.getSiteById(req.params.id);
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

    const result = await AdminSiteService.updateSite(req.params.id, req.body);
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
    const result = await AdminSiteService.deleteSite(req.params.id);
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
    const result = await AdminSiteService.restoreSite(req.params.id);
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

// ===================== USER FAVORITES =====================

// User: Add site to favorites
exports.addFavorite = async (req, res) => {
  try {
    const result = await SiteService.addFavorite(req.user.id, req.params.id);
    return ResponseUtil.success(res, result, req.__('site.favorite_added'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    if (error.message === 'Site not active') {
      return ResponseUtil.badRequest(res, req.__('site.not_active'));
    }
    if (error.message === 'Already favorited') {
      return ResponseUtil.conflict(res, req.__('site.already_favorited'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// User: Remove site from favorites
exports.removeFavorite = async (req, res) => {
  try {
    const result = await SiteService.removeFavorite(req.user.id, req.params.id);
    return ResponseUtil.success(res, result, req.__('site.favorite_removed'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    if (error.message === 'Not favorited') {
      return ResponseUtil.badRequest(res, req.__('site.not_favorited'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// ===================== PUBLIC SITE =====================

// Public: Get all sites (approved)
exports.getPublicSites = async (req, res) => {
  try {
    const result = await SiteService.getPublicSites(req.query);
    return ResponseUtil.success(res, result, req.__('site.get_list_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Public: Get site by ID or code
exports.getPublicSiteById = async (req, res) => {
  try {
    const result = await SiteService.getPublicSiteById(req.params.id);
    return ResponseUtil.success(res, result, req.__('site.get_detail_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Public: Get site media (gallery)
exports.getPublicSiteMedia = async (req, res) => {
  try {
    const result = await SiteService.getPublicSiteMedia(req.params.siteId, req.query);
    return ResponseUtil.success(res, result, req.__('site.get_media_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Public: Get site mass schedules
exports.getPublicSiteMassSchedules = async (req, res) => {
  try {
    const result = await SiteService.getPublicSiteMassSchedules(req.params.siteId, req.query);
    return ResponseUtil.success(res, result, req.__('site.get_schedules_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Public: Get site events
exports.getPublicSiteEvents = async (req, res) => {
  try {
    const result = await SiteService.getPublicSiteEvents(req.params.siteId, req.query);
    return ResponseUtil.success(res, result, req.__('site.get_events_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Public: Get site nearby places
exports.getPublicSiteNearbyPlaces = async (req, res) => {
  try {
    const result = await SiteService.getPublicSiteNearbyPlaces(req.params.siteId, req.query);
    return ResponseUtil.success(res, result, req.__('site.get_nearby_places_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};


// ===================== ADMIN SITE DETAIL ENDPOINTS =====================

// Admin: Get local guides of a site
exports.getSiteGuides = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await AdminSiteService.getSiteGuides(req.params.siteId, { page, limit });
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
    const result = await AdminSiteService.getSiteShifts(req.params.siteId, { page, limit, status });
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
    const { page, limit, status, type } = req.query;
    const result = await AdminSiteService.getSiteMedia(req.params.siteId, { page, limit, status, type });
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
    const { page, limit, status } = req.query;
    const result = await AdminSiteService.getSiteSchedules(req.params.siteId, { page, limit, status });
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
    const { page, limit, status } = req.query;
    const result = await AdminSiteService.getSiteEvents(req.params.siteId, { page, limit, status });
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
    const { page, limit, status, category } = req.query;
    const result = await AdminSiteService.getSiteNearbyPlaces(req.params.siteId, { page, limit, status, category });
    return ResponseUtil.success(res, result, req.__('site.get_nearby_places_success'));
  } catch (error) {
    if (error.message === 'Site not found') {
      return ResponseUtil.notFound(res, req.__('site.not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// ===================== MANAGER TRANSITION =====================

// Public: Get sites available for manager transition
exports.getAvailableSites = async (req, res) => {
  try {
    const { page, limit, province, region, search } = req.query;
    const result = await SiteService.getAvailableSites({
      page, limit, province, region, search
    });
    return ResponseUtil.success(res, result, req.__('site.available_sites_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

