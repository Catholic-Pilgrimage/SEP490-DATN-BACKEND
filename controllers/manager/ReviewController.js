const reviewReplyService = require('../../services/localGuide/reviewReplyService');
const ResponseUtil = require('../../utils/response.util');

module.exports = {
    /**
     * Get all reviews for my site (manager)
     * GET /api/manager/reviews
     */
    async getReviewsForMySite(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                page: req.query.page || 1,
                limit: req.query.limit || 10,
                sort: req.query.sort || 'newest',
                type: req.query.type || 'all',
                has_reply: req.query.has_reply
            };

            const result = await reviewReplyService.getReviewsForMySite(userId, filters);
            return ResponseUtil.success(res, result, req.__('review.list_retrieved'));
        } catch (error) {
            console.error('ManagerReviewController.getReviewsForMySite error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }
};
