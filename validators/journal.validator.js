const { body, query } = require('express-validator');

class JournalValidator {
    static createJournal = [
        body('title')
            .notEmpty().withMessage('Title is required')
            .isLength({ max: 500 }).withMessage('Title must be at most 500 characters')
            .trim(),

        body('content')
            .notEmpty().withMessage('Content is required')
            .trim(),

        body('planner_item_id')
            .optional()
            .isUUID().withMessage('Planner item ID is invalid'),

        body('planner_id')
            .optional()
            .isUUID().withMessage('Planner ID is invalid'),

        body().custom((value, { req }) => {
            const hasPlannerItemId = Boolean(req.body?.planner_item_id);
            const hasPlannerId = Boolean(req.body?.planner_id);

            if (!hasPlannerItemId && !hasPlannerId) {
                throw new Error('Planner Item ID or Planner ID is required');
            }

            if (hasPlannerItemId && hasPlannerId) {
                throw new Error('Only one of planner_item_id or planner_id is allowed');
            }

            return true;
        })
    ];

    static updateJournal = [
        body('title')
            .optional()
            .isLength({ max: 500 }).withMessage('Title must be at most 500 characters')
            .trim(),

        body('content')
            .optional()
            .trim(),

        body('site_id')
            .optional()
            .isString().withMessage('Site ID must be a string')
    ];

    static getPublicJournals = [];

    static getUserJournals = [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ];
}

module.exports = JournalValidator;
