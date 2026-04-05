const { body, param, query } = require('express-validator');

const getImageUrlInput = (bodyValue) => (
    bodyValue?.image_urls !== undefined
        ? bodyValue.image_urls
        : bodyValue?.['image_urls[]']
);

const normalizeStringArrayInput = (rawValue) => {
    if (rawValue === undefined) {
        return undefined;
    }

    if (Array.isArray(rawValue)) {
        return rawValue;
    }

    if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        if (!trimmed) {
            return [];
        }

        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return Array.isArray(parsed) ? parsed : null;
            } catch (error) {
                return null;
            }
        }

        return [trimmed];
    }

    return null;
};

const isValidUrl = (value) => {
    try {
        new URL(value);
        return true;
    } catch (error) {
        return false;
    }
};

const postValidator = {
    /**
     * Validation for creating a post
     */
    createPost: [
        body('title')
            .optional()
            .isString()
            .withMessage('Post title must be a string')
            .trim()
            .isLength({ max: 255 })
            .withMessage('Post title must not exceed 255 characters'),

        body('content')
            .trim()
            .notEmpty()
            .withMessage('Post content is required')
            .isLength({ min: 1, max: 10000 })
            .withMessage('Post content must be between 1 and 10000 characters'),

        body().custom((value, { req }) => {
            const imageUrls = normalizeStringArrayInput(getImageUrlInput(req.body));

            if (imageUrls === null) {
                throw new Error('Image URLs must be an array');
            }

            if (imageUrls !== undefined && imageUrls.some(url => typeof url !== 'string' || !isValidUrl(url.trim()))) {
                throw new Error('Each image URL must be a valid URL');
            }

            if (imageUrls !== undefined) {
                req.body.image_urls = imageUrls.map(url => url.trim());
            }

            return true;
        }),

        body('video_url')
            .optional({ values: 'falsy' })
            .isURL()
            .withMessage('Video URL must be a valid URL'),

        body('audio_url')
            .optional({ values: 'falsy' })
            .isURL()
            .withMessage('Audio URL must be a valid URL')
    ],

    /**
     * Validation for updating a post
     */
    updatePost: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        body('title')
            .optional()
            .isString()
            .withMessage('Post title must be a string')
            .trim()
            .isLength({ max: 255 })
            .withMessage('Post title must not exceed 255 characters'),

        body('content')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Post content cannot be empty')
            .isLength({ min: 1, max: 10000 })
            .withMessage('Post content must be between 1 and 10000 characters'),

        body().custom((value, { req }) => {
            const imageUrls = normalizeStringArrayInput(getImageUrlInput(req.body));

            if (imageUrls === null) {
                throw new Error('Image URLs must be an array');
            }

            if (imageUrls !== undefined && imageUrls.some(url => typeof url !== 'string' || !isValidUrl(url.trim()))) {
                throw new Error('Each image URL must be a valid URL');
            }

            if (imageUrls !== undefined) {
                req.body.image_urls = imageUrls.map(url => url.trim());
            }

            return true;
        }),

        body('video_url')
            .optional({ values: 'falsy' })
            .isURL()
            .withMessage('Video URL must be a valid URL'),

        body('audio_url')
            .optional({ values: 'falsy' })
            .isURL()
            .withMessage('Audio URL must be a valid URL')
    ],

    /**
     * Validation for getting posts
     */
    getPosts: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ],

    /**
     * Validation for post ID parameter
     */
    postId: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID')
    ],

    /**
     * Validation for creating a comment
     */
    createComment: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        body('content')
            .trim()
            .notEmpty()
            .withMessage('Comment content is required')
            .isLength({ min: 1, max: 5000 })
            .withMessage('Comment content must be between 1 and 5000 characters'),
            
        body('parent_id')
            .optional()
            .isUUID()
            .withMessage('Invalid parent comment ID')
    ],

    /**
     * Validation for replying to a comment
     */
    replyComment: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        param('commentId')
            .isUUID()
            .withMessage('Invalid comment ID'),

        body('content')
            .trim()
            .notEmpty()
            .withMessage('Reply content is required')
            .isLength({ min: 1, max: 5000 })
            .withMessage('Reply content must be between 1 and 5000 characters')
    ],

    /**
     * Validation for updating a comment
     */
    updateComment: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        param('commentId')
            .isUUID()
            .withMessage('Invalid comment ID'),

        body('content')
            .trim()
            .notEmpty()
            .withMessage('Comment content is required')
            .isLength({ min: 1, max: 5000 })
            .withMessage('Comment content must be between 1 and 5000 characters')
    ],

    /**
     * Validation for comment ID parameter
     */
    commentId: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        param('commentId')
            .isUUID()
            .withMessage('Invalid comment ID')
    ],

    /**
     * Validation for getting comments
     */
    getComments: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
    ]
};

module.exports = postValidator;
