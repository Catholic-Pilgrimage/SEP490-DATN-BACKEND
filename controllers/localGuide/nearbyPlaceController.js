const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide: Create Nearby Place
 * POST /api/local-guide/nearby-places
 */
exports.createNearbyPlace = async (req, res) => {
    try {
        const result = await LocalGuideService.createNearbyPlace(req.user.id, req.body);
        return ResponseUtil.created(res, result, req.__('local_guide.create_nearby_place_success'));
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
 * Local Guide: Get My Nearby Places
 * GET /api/local-guide/nearby-places
 */
exports.getNearbyPlaces = async (req, res) => {
    try {
        const { page, limit, status, category } = req.query;
        const result = await LocalGuideService.getNearbyPlaces(req.user.id, { page, limit, status, category });
        return ResponseUtil.success(res, result, req.__('local_guide.get_nearby_places_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Nearby Place
 * PUT /api/local-guide/nearby-places/:id
 */
exports.updateNearbyPlace = async (req, res) => {
    try {
        const result = await LocalGuideService.updateNearbyPlace(req.user.id, req.params.id, req.body);
        return ResponseUtil.success(res, result, req.__('local_guide.update_nearby_place_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Nearby place not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.nearby_place_not_found'));
        }
        if (error.message === 'Cannot update approved nearby place') {
            return ResponseUtil.badRequest(res, req.__('local_guide.update_approved_nearby_place_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Nearby Place
 * DELETE /api/local-guide/nearby-places/:id
 */
exports.deleteNearbyPlace = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteNearbyPlace(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_nearby_place_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Nearby place not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.nearby_place_not_found'));
        }
        if (error.message === 'Cannot delete approved nearby place') {
            return ResponseUtil.badRequest(res, req.__('local_guide.delete_approved_nearby_place_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Restore Nearby Place
 * PATCH /api/local-guide/nearby-places/:id/restore
 */
exports.restoreNearbyPlace = async (req, res) => {
    try {
        const result = await LocalGuideService.restoreNearbyPlace(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.restore_nearby_place_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Nearby place not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.nearby_place_not_found'));
        }
        if (error.message === 'Cannot restore approved nearby place') {
            return ResponseUtil.badRequest(res, req.__('local_guide.restore_approved_nearby_place_error'));
        }
        if (error.message === 'Nearby place is already active') {
            return ResponseUtil.badRequest(res, req.__('local_guide.nearby_place_already_active'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
