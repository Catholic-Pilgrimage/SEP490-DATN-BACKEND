const reviewService = require('../../services/pilgrim/reviewService');
const ResponseUtil = require('../../utils/response.util');

class PilgrimReviewController {
    /**
     * Create a review for a site
     * POST /api/sites/:siteId/reviews
     */
    async createSiteReview(req, res) {
        try {
            const userId = req.user.id;
            const { siteId } = req.params;

            const data = {
                rating: req.body.rating,
                feedback: req.body.feedback,
                image_urls: req.files ? req.files.map(f => f.path) : (req.body.image_urls || [])
            };

            const review = await reviewService.createSiteReview(userId, siteId, data);
            return ResponseUtil.created(res, review, req.__('review.created'));
        } catch (error) {
            console.error('PilgrimReviewController.createSiteReview error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Get reviews for a site
     * GET /api/sites/:siteId/reviews
     */
    async getSiteReviews(req, res) {
        try {
            const { siteId } = req.params;
            const filters = {
                page: req.query.page || 1,
                limit: req.query.limit || 10,
                sort: req.query.sort || 'newest'
            };

            const result = await reviewService.getSiteReviews(siteId, filters);
            return ResponseUtil.success(res, result, req.__('review.list_retrieved'));
        } catch (error) {
            console.error('PilgrimReviewController.getSiteReviews error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Update a site review
     * PUT /api/sites/:siteId/reviews/:reviewId
     */
    async updateSiteReview(req, res) {
        try {
            const userId = req.user.id;
            const { siteId, reviewId } = req.params;

            const data = {
                rating: req.body.rating,
                feedback: req.body.feedback,
                image_urls: req.files && req.files.length > 0
                    ? req.files.map(f => f.path)
                    : req.body.image_urls
            };

            const review = await reviewService.updateSiteReview(userId, reviewId, siteId, data);
            return ResponseUtil.success(res, review, req.__('review.updated'));
        } catch (error) {
            console.error('PilgrimReviewController.updateSiteReview error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Delete a site review
     * DELETE /api/sites/:siteId/reviews/:reviewId
     */
    async deleteSiteReview(req, res) {
        try {
            const userId = req.user.id;
            const { siteId, reviewId } = req.params;

            const result = await reviewService.deleteSiteReview(userId, reviewId, siteId);
            return ResponseUtil.success(res, result, req.__('review.deleted'));
        } catch (error) {
            console.error('PilgrimReviewController.deleteSiteReview error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }
}

module.exports = new PilgrimReviewController();
