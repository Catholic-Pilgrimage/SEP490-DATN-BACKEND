const { body, param, query } = require('express-validator');

class PlannerChatValidator {
    // Validate planner ID
    static validatePlannerId = [
        param('id')
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid'))
    ];

    // Validate get messages
    static getMessages = [
        param('id')
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid')),
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage((value, { req }) => req.__('validation.page_positive')),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage((value, { req }) => req.__('validation.limit_range'))
    ];

    // Validate send message
    static sendMessage = [
        param('id')
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid')),
        body('message_type')
            .optional()
            .isIn(['text', 'image'])
            .withMessage((value, { req }) => req.__('validation.invalid_message_type')),
        body('content')
            .optional({ checkFalsy: true })
            .isString()
            .trim()
            .isLength({ max: 1000 })
            .withMessage((value, { req }) => req.__('validation.content_length')),
        body('image_url')
            .optional()
            .isURL()
            .withMessage((value, { req }) => req.__('validation.invalid_url'))
    ];

    // Validate delete message
    static deleteMessage = [
        param('id')
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid')),
        param('messageId')
            .isUUID()
            .withMessage((value, { req }) => req.__('validation.invalid_uuid'))
    ];
}

module.exports = PlannerChatValidator;
