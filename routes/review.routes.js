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

// ========================
// NEARBY PLACE REVIEWS (Pilgrim)
// ========================

// GET /api/sites/:siteId/nearby-places/:nearbyPlaceId/reviews (PUBLIC)
router.get(
    '/:siteId/nearby-places/:nearbyPlaceId/reviews',
    ReviewValidator.validateSiteId,
    ReviewValidator.validateNearbyPlaceId,
    ReviewValidator.getReviews,
    handleValidationErrors,
    PilgrimReviewController.getNearbyPlaceReviews
);

// POST /api/sites/:siteId/nearby-places/:nearbyPlaceId/reviews
router.post(
    '/:siteId/nearby-places/:nearbyPlaceId/reviews',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadReviewImages,
    ReviewValidator.validateSiteId,
    ReviewValidator.validateNearbyPlaceId,
    ReviewValidator.createReview,
    handleValidationErrors,
    PilgrimReviewController.createNearbyPlaceReview
);

// PUT /api/sites/:siteId/nearby-places/:nearbyPlaceId/reviews/:reviewId
router.put(
    '/:siteId/nearby-places/:nearbyPlaceId/reviews/:reviewId',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadReviewImages,
    ReviewValidator.validateSiteId,
    ReviewValidator.validateNearbyPlaceId,
    ReviewValidator.validateReviewId,
    ReviewValidator.updateReview,
    handleValidationErrors,
    PilgrimReviewController.updateNearbyPlaceReview
);

// DELETE /api/sites/:siteId/nearby-places/:nearbyPlaceId/reviews/:reviewId
router.delete(
    '/:siteId/nearby-places/:nearbyPlaceId/reviews/:reviewId',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    ReviewValidator.validateSiteId,
    ReviewValidator.validateNearbyPlaceId,
    ReviewValidator.validateReviewId,
    handleValidationErrors,
    PilgrimReviewController.deleteNearbyPlaceReview
);

module.exports = router;
