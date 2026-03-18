const PlannerOfflineService = require('../../services/pilgrim/plannerOfflineService');
const ResponseUtil = require('../../utils/response.util');

/**
 * GET /api/planners/:id/offline-data
 * Get planner data bundle for offline usage
 */
exports.getOfflineData = async (req, res) => {
    try {
        const { id: plannerId } = req.params;
        const userId = req.user.id;

        const data = await PlannerOfflineService.bundlePlannerData(plannerId, userId);

        return ResponseUtil.success(res, data, req.__('offline.download_success'));
    } catch (error) {
        if (error.message === 'Planner not found') {
            return ResponseUtil.notFound(res, req.__('planner.not_found'));
        }
        if (error.message === 'Forbidden') {
            return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
