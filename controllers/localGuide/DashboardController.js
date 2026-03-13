const LocalGuideDashboardService = require('../../services/localGuide/dashboardService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * Local Guide: Get dashboard overview
 * GET /api/local-guide/dashboard/overview
 */
exports.getOverview = async (req, res) => {
    try {
        const localGuideId = req.user.id;
        const data = await LocalGuideDashboardService.getOverview(localGuideId);
        return ResponseUtil.success(res, data, req.__('local_guide.dashboard_success'));
    } catch (error) {
        Logger.error('Get local guide dashboard overview controller error:', error);
        if (error.message === 'Local Guide not assigned to any site') {
            return ResponseUtil.error(res, req.__('local_guide.no_site_assigned'), 403);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
