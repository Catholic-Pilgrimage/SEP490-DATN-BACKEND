const AdminDashboardService = require('../../services/admin/dashboardService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * Admin: Get dashboard overview
 * GET /api/admin/dashboard/overview
 * Query params: period (today|week|month|custom), from_date, to_date
 */
exports.getOverview = async (req, res) => {
    try {
        const { period, from_date, to_date } = req.query;
        const data = await AdminDashboardService.getOverview({ period, from_date, to_date });
        return ResponseUtil.success(res, data, req.__('admin.dashboard_success'));
    } catch (error) {
        Logger.error('Get dashboard overview controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get user growth analytics
 * GET /api/admin/dashboard/analytics/users-growth
 * Query params: period (today|week|month|custom), from_date, to_date, days
 */
exports.getUserGrowth = async (req, res) => {
    try {
        const { period, from_date, to_date, days } = req.query;
        const data = await AdminDashboardService.getUserGrowth({ period, from_date, to_date, days });
        return ResponseUtil.success(res, data, req.__('admin.analytics_success'));
    } catch (error) {
        Logger.error('Get user growth controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get check-ins analytics
 * GET /api/admin/dashboard/analytics/checkins
 * Query params: period (today|week|month|custom), from_date, to_date, days
 */
exports.getCheckinsAnalytics = async (req, res) => {
    try {
        const { period, from_date, to_date, days } = req.query;
        const data = await AdminDashboardService.getCheckinsAnalytics({ period, from_date, to_date, days });
        return ResponseUtil.success(res, data, req.__('admin.analytics_success'));
    } catch (error) {
        Logger.error('Get checkins analytics controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get popular sites
 * GET /api/admin/dashboard/analytics/popular-sites
 * Query params: period (today|week|month|custom), from_date, to_date, limit
 */
exports.getPopularSites = async (req, res) => {
    try {
        const { period, from_date, to_date, limit } = req.query;
        const data = await AdminDashboardService.getPopularSites({ period, from_date, to_date, limit });
        return ResponseUtil.success(res, data, req.__('admin.analytics_success'));
    } catch (error) {
        Logger.error('Get popular sites controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get SOS requests by site
 * GET /api/admin/dashboard/analytics/sos-by-site
 * Query params: period (today|week|month|custom), from_date, to_date, limit
 */
exports.getSOSBySite = async (req, res) => {
    try {
        const { period, from_date, to_date, limit } = req.query;
        const data = await AdminDashboardService.getSOSBySite({ period, from_date, to_date, limit });
        return ResponseUtil.success(res, data, req.__('admin.analytics_success'));
    } catch (error) {
        Logger.error('Get SOS by site controller error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
