const { body, query } = require('express-validator');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePlannerItemIdInput = (rawValue) => {
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
                return Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                return null;
            }
        }

        return [trimmed];
    }

    return [];
};

const getPlannerItemIdInput = (bodyValue) => (
    bodyValue?.planner_item_id !== undefined
        ? bodyValue.planner_item_id
        : bodyValue?.['planner_item_id[]'] !== undefined
            ? bodyValue['planner_item_id[]']
            : bodyValue?.planner_item_ids !== undefined
                ? bodyValue.planner_item_ids
                : bodyValue?.['planner_item_ids[]']
);

class JournalValidator {
    static createJournal = [
        body('title')
            .notEmpty().withMessage('Title is required')
            .isLength({ max: 500 }).withMessage('Title must be at most 500 characters')
            .trim(),

        body('content')
            .notEmpty().withMessage('Content is required')
            .trim(),

        body('planner_id')
            .optional()
            .isUUID().withMessage('Planner ID is invalid'),

        body().custom((value, { req }) => {
            const plannerItemIds = normalizePlannerItemIdInput(getPlannerItemIdInput(req.body));
            const hasPlannerItemId = Array.isArray(plannerItemIds) && plannerItemIds.length > 0;
            const hasPlannerId = Boolean(req.body?.planner_id);

            if (plannerItemIds === null) {
                throw new Error('Planner item ID is invalid');
            }

            if (getPlannerItemIdInput(req.body) !== undefined && !hasPlannerItemId) {
                throw new Error('Planner item ID is invalid');
            }

            if (Array.isArray(plannerItemIds) && plannerItemIds.some(id => typeof id !== 'string' || !UUID_REGEX.test(id.trim()))) {
                throw new Error('Planner item ID is invalid');
            }

            if (!hasPlannerItemId && !hasPlannerId) {
                throw new Error('Planner Item ID or Planner ID is required');
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
