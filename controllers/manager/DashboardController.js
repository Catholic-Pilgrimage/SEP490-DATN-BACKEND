const ManagerDashboardService = require('../../services/manager/dashboardService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * Manager: Get dashboard overview for their site
 * GET /api/manager/dashboard/overview
 * Query params: period (today|week|month|custom), from_date, to_date
 */
exports.getOverview = async (req, res) => {
    try {
        const managerId = req.user.id;
        const { period, from_date, to_date } = req.query;
        const data = await ManagerDashboardService.getOverview(managerId, { period, from_date, to_date });
        return ResponseUtil.success(res, data, req.__('manager.dashboard_success'));
    } catch (error) {
        Logger.error('Get manager dashboard overview controller error:', error);
        if (error.message === 'Manager not assigned to any site') {
            return ResponseUtil.error(res, req.__('manager.no_site_assigned'), 403);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Get check-ins analytics for their site
 * GET /api/manager/dashboard/analytics/checkins
 * Query params: period (today|week|month|custom), from_date, to_date, days
 */
exports.getCheckinsAnalytics = async (req, res) => {
    try {
        const managerId = req.user.id;
        const { period, from_date, to_date, days } = req.query;
        const data = await ManagerDashboardService.getCheckinsAnalytics(managerId, { period, from_date, to_date, days });
        return ResponseUtil.success(res, data, req.__('manager.analytics_success'));
    } catch (error) {
        Logger.error('Get manager checkins analytics controller error:', error);
        if (error.message === 'Manager not assigned to any site') {
            return ResponseUtil.error(res, req.__('manager.no_site_assigned'), 403);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
