const { PilgrimSiteService } = require('../../services/pilgrim');
const ResponseUtil = require('../../utils/response.util');

// Pilgrim: Get favorite sites
exports.getFavorites = async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await PilgrimSiteService.getFavorites(req.user.id, { page, limit });
        return ResponseUtil.success(res, result, req.__('site.get_favorites_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Pilgrim: Add site to favorites
exports.addFavorite = async (req, res) => {
    try {
        const result = await PilgrimSiteService.addFavorite(req.user.id, req.params.id);
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

// Pilgrim: Remove site from favorites
exports.removeFavorite = async (req, res) => {
    try {
        const result = await PilgrimSiteService.removeFavorite(req.user.id, req.params.id);
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

// ===================== PUBLIC APIs =====================

// Public: Get all sites (approved)
exports.getPublicSites = async (req, res) => {
    try {
        const result = await PilgrimSiteService.getPublicSites(req.query);
        return ResponseUtil.success(res, result, req.__('site.get_list_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Public: Get site by ID or code
exports.getPublicSiteById = async (req, res) => {
    try {
        const result = await PilgrimSiteService.getPublicSiteById(req.params.id);
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
        const result = await PilgrimSiteService.getPublicSiteMedia(req.params.siteId, req.query);
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
        const result = await PilgrimSiteService.getPublicSiteMassSchedules(req.params.siteId, req.query);
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
        const result = await PilgrimSiteService.getPublicSiteEvents(req.params.siteId, req.query);
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
        const result = await PilgrimSiteService.getPublicSiteNearbyPlaces(req.params.siteId, req.query);
        return ResponseUtil.success(res, result, req.__('site.get_nearby_places_success'));
    } catch (error) {
        if (error.message === 'Site not found') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Public: Get sites available for manager transition
exports.getAvailableSites = async (req, res) => {
    try {
        const { page, limit, province, region, search, claim_type } = req.query;
        const result = await PilgrimSiteService.getAvailableSites({
            page, limit, province, region, search, claim_type
        });
        return ResponseUtil.success(res, result, req.__('site.available_sites_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
