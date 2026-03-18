const PilgrimDashboardService = require('../../services/pilgrim/dashboardService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * Pilgrim: Get dashboard overview
 * GET /api/pilgrim/dashboard/overview
 */
exports.getOverview = async (req, res) => {
    try {
        const pilgrimId = req.user.id;
        const data = await PilgrimDashboardService.getOverview(pilgrimId);
        return ResponseUtil.success(res, data, req.__('pilgrim.dashboard_success'));
    } catch (error) {
        Logger.error('Get pilgrim dashboard overview controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
