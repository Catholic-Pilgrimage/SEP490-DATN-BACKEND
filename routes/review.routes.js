const express = require('express');
const router = express.Router();
const PilgrimReviewController = require('../controllers/pilgrim/ReviewController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const ReviewValidator = require('../validators/review.validator');
const { handleValidationErrors } = require('../utils/validation.util');
const { uploadReviewImages } = require('../config/cloudinary.config');

router.use(i18nMiddleware);

// ========================
// SITE REVIEWS (Pilgrim)
// ========================

// GET /api/sites/:siteId/reviews - List reviews for a site (PUBLIC)
router.get(
    '/:siteId/reviews',
    ReviewValidator.validateSiteId,
    ReviewValidator.getReviews,
    handleValidationErrors,
    PilgrimReviewController.getSiteReviews
);

// POST /api/sites/:siteId/reviews - Create review for a site
router.post(
    '/:siteId/reviews',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadReviewImages,
    ReviewValidator.validateSiteId,
    ReviewValidator.createReview,
    handleValidationErrors,
    PilgrimReviewController.createSiteReview
);

// PUT /api/sites/:siteId/reviews/:reviewId - Update my review
router.put(
    '/:siteId/reviews/:reviewId',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadReviewImages,
    ReviewValidator.validateSiteId,
    ReviewValidator.validateReviewId,
    ReviewValidator.updateReview,
    handleValidationErrors,
    PilgrimReviewController.updateSiteReview
);

// DELETE /api/sites/:siteId/reviews/:reviewId - Delete my review
router.delete(
    '/:siteId/reviews/:reviewId',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    ReviewValidator.validateSiteId,
    ReviewValidator.validateReviewId,
    handleValidationErrors,
    PilgrimReviewController.deleteSiteReview
);

module.exports = router;
