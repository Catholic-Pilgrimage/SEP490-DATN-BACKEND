const reviewReplyService = require('../../services/localGuide/reviewReplyService');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide review reply controller
 * Handles reply to site reviews
 */
module.exports = {
    /**
     * Get all reviews for my site (auto-scoped)
     * GET /api/local-guide/reviews
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
            console.error('reviewReplyController.getReviewsForMySite error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    },

    /**
     * Reply to a site review
     * POST /api/local-guide/site-reviews/:reviewId/reply
     */
    async replySiteReview(req, res) {
        try {
            const userId = req.user.id;
            const { reviewId } = req.params;
            const { content } = req.body;

            const reply = await reviewReplyService.replySiteReview(userId, reviewId, content);
            return ResponseUtil.created(res, reply, req.__('review.reply_created'));
        } catch (error) {
            console.error('reviewReplyController.replySiteReview error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    },

    /**
     * Update a site review reply
     * PUT /api/local-guide/site-reviews/:reviewId/reply
     */
    async updateSiteReviewReply(req, res) {
        try {
            const userId = req.user.id;
            const { reviewId } = req.params;
            const { content } = req.body;

            const reply = await reviewReplyService.updateSiteReviewReply(userId, reviewId, content);
            return ResponseUtil.success(res, reply, req.__('review.reply_updated'));
        } catch (error) {
            console.error('reviewReplyController.updateSiteReviewReply error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    },

    /**
     * Delete a site review reply
     * DELETE /api/local-guide/site-reviews/:reviewId/reply
     */
    async deleteSiteReviewReply(req, res) {
        try {
            const userId = req.user.id;
            const { reviewId } = req.params;

            const result = await reviewReplyService.deleteSiteReviewReply(userId, reviewId);
            return ResponseUtil.success(res, result, req.__('review.reply_deleted'));
        } catch (error) {
            console.error('reviewReplyController.deleteSiteReviewReply error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }
};
