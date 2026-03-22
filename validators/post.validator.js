const { body, param, query } = require('express-validator');

const postValidator = {
    /**
     * Validation for creating a post
     */
    createPost: [
        body('content')
            .trim()
            .notEmpty()
            .withMessage('Post content is required')
            .isLength({ min: 1, max: 10000 })
            .withMessage('Post content must be between 1 and 10000 characters'),

        body('image_urls')
            .optional()
            .isArray()
            .withMessage('Image URLs must be an array'),

        body('image_urls.*')
            .optional()
            .isURL()
            .withMessage('Each image URL must be a valid URL')
    ],

    /**
     * Validation for updating a post
     */
    updatePost: [
        param('id')
            .isUUID()
            .withMessage('Invalid post ID'),

        body('content')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Post content cannot be empty')
            .isLength({ min: 1, max: 10000 })
            .withMessage('Post content must be between 1 and 10000 characters'),

        body('image_urls')
            .optional()
            .isArray()
            .withMessage('Image URLs must be an array'),

        body('image_urls.*')
            .optional()
            .isURL()
            .withMessage('Each image URL must be a valid URL')
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
