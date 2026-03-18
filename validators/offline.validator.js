const { body } = require('express-validator');

const OfflineValidator = {
    syncActions: [
        body('actions')
            .isArray({ min: 1 })
            .withMessage('Actions must be a non-empty array'),
        
        body('actions.*.client_action_id')
            .notEmpty()
            .withMessage('client_action_id is required')
            .isString()
            .withMessage('client_action_id must be a string'),
        
        body('actions.*.type')
            .notEmpty()
            .withMessage('Action type is required')
            .isIn(['CHECK_IN', 'CREATE_JOURNAL'])
            .withMessage('Action type must be CHECK_IN or CREATE_JOURNAL'),
        
        body('actions.*.offline_time')
            .notEmpty()
            .withMessage('offline_time is required')
            .isISO8601()
            .withMessage('offline_time must be a valid ISO 8601 date'),
        
        body('actions.*.planner_item_id')
            .notEmpty()
            .withMessage('planner_item_id is required')
            .isUUID()
            .withMessage('planner_item_id must be a valid UUID'),
        
        // CHECK_IN specific validations
        body('actions.*.latitude')
            .optional()
            .isFloat({ min: -90, max: 90 })
            .withMessage('latitude must be between -90 and 90'),
        
        body('actions.*.longitude')
            .optional()
            .isFloat({ min: -180, max: 180 })
            .withMessage('longitude must be between -180 and 180'),
        
        body('actions.*.note')
            .optional()
            .isString()
            .withMessage('note must be a string')
            .isLength({ max: 500 })
            .withMessage('note must not exceed 500 characters'),
        
        // CREATE_JOURNAL specific validations
        body('actions.*.title')
            .optional()
            .isString()
            .withMessage('title must be a string')
            .isLength({ min: 1, max: 200 })
            .withMessage('title must be between 1 and 200 characters'),
        
        body('actions.*.content')
            .optional()
            .isString()
            .withMessage('content must be a string')
            .isLength({ min: 1, max: 10000 })
            .withMessage('content must be between 1 and 10000 characters'),
        
        body('actions.*.privacy')
            .optional()
            .isIn(['private', 'public'])
            .withMessage('privacy must be private or public')
    ]
};

module.exports = OfflineValidator;
