const { body, param, query } = require('express-validator');

const reviewValidator = {
    /**
     * Validate creating a review
     */
    createReview: [
        body('rating')
            .notEmpty()
            .withMessage('Rating is required')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),

        body('feedback')
            .optional()
            .trim()
            .isLength({ max: 5000 })
            .withMessage('Feedback must not exceed 5000 characters'),

        body('image_urls')
            .optional()
            .isArray({ max: 5 })
            .withMessage('Maximum 5 images allowed'),

        body('image_urls.*')
            .optional()
            .isURL()
            .withMessage('Each image URL must be a valid URL')
    ],

    /**
     * Validate updating a review
     */
    updateReview: [
        body('rating')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),

        body('feedback')
            .optional()
            .trim()
            .isLength({ max: 5000 })
            .withMessage('Feedback must not exceed 5000 characters'),

        body('image_urls')
            .optional()
            .isArray({ max: 5 })
            .withMessage('Maximum 5 images allowed'),

        body('image_urls.*')
            .optional()
            .isURL()
            .withMessage('Each image URL must be a valid URL')
    ],

    /**
     * Validate siteId param
     */
    validateSiteId: [
        param('siteId')
            .isUUID()
            .withMessage('Invalid site ID')
    ],

    /**
     * Validate nearbyPlaceId param
     */
    validateNearbyPlaceId: [
        param('nearbyPlaceId')
            .isUUID()
            .withMessage('Invalid nearby place ID')
    ],

    /**
     * Validate reviewId param
     */
    validateReviewId: [
        param('reviewId')
            .isUUID()
            .withMessage('Invalid review ID')
    ],

    /**
     * Validate reply content
     */
    reply: [
        body('content')
            .trim()
            .notEmpty()
            .withMessage('Reply content is required')
            .isLength({ min: 1, max: 2000 })
            .withMessage('Reply content must be between 1 and 2000 characters')
    ],

    /**
     * Validate query params for listing reviews
     */
    getReviews: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 50 })
            .withMessage('Limit must be between 1 and 50'),

        query('sort')
            .optional()
            .isIn(['newest', 'oldest', 'highest', 'lowest'])
            .withMessage('Sort must be: newest, oldest, highest, or lowest')
    ]
};

module.exports = reviewValidator;
