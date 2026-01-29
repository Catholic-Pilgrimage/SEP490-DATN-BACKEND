const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

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
