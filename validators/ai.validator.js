const { body } = require('express-validator');

const aiValidator = {
    // ========================
    // PILGRIM: Suggest Route
    // ========================
    suggestRoute: [
        body('site_ids')
            .isArray({ min: 2, max: 15 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.site_ids_invalid') : 'site_ids must be an array of 2–15 site UUIDs'
            ),

        body('site_ids.*')
            .isUUID()
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.site_id_invalid_uuid') : 'Each site_id must be a valid UUID'
            ),

        body('transport_mode')
            .optional()
            .isIn(['car', 'bus', 'motorbike'])
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.transport_mode_invalid') : 'transport_mode must be car, bus, or motorbike'
            ),

        body('priority')
            .optional()
            .isIn(['shortest_distance', 'most_spiritual', 'balanced'])
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.priority_invalid') : 'priority must be shortest_distance, most_spiritual, or balanced'
            ),

        body('number_of_people')
            .optional()
            .isInt({ min: 1 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.number_of_people_invalid') : 'number_of_people must be a positive integer'
            ),

        body('max_days')
            .optional()
            .isInt({ min: 1, max: 30 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.max_days_invalid') : 'max_days must be between 1 and 30'
            ),

        body('start_date')
            .optional()
            .isISO8601()
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.start_date_invalid') : 'start_date must be a valid ISO 8601 date'
            )
    ],

    // ========================
    // PILGRIM: Suggest Prayer
    // ========================
    suggestPrayer: [
        body('planner_item_id')
            .optional()
            .isUUID()
            .withMessage((value, { req }) =>
                req.__ ? req.__('validation.invalid_uuid') : 'planner_item_id must be a valid UUID'
            ),

        body('planner_id')
            .optional()
            .isUUID()
            .withMessage((value, { req }) =>
                req.__ ? req.__('validation.invalid_uuid') : 'planner_id must be a valid UUID'
            ),

        body('current_text')
            .optional()
            .trim()
            .isLength({ max: 5000 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.current_text_too_long') : 'current_text must not exceed 5000 characters'
            ),

        body('mood')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.mood_too_long') : 'mood must not exceed 200 characters'
            ),

        body('intention')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.intention_too_long') : 'intention must not exceed 500 characters'
            ),

        // Custom: XOR — exactly one of planner_item_id or planner_id
        body().custom((value, { req }) => {
            const { planner_item_id, planner_id } = req.body;
            if (!planner_item_id && !planner_id) {
                throw new Error(
                    req.__ ? req.__('ai.prayer_context_required') : 'Either planner_item_id or planner_id is required'
                );
            }
            if (planner_item_id && planner_id) {
                throw new Error(
                    req.__ ? req.__('ai.prayer_context_required') : 'Cannot provide both planner_item_id and planner_id'
                );
            }
            return true;
        }),

        // Custom: At least one of current_text, mood, intention
        body().custom((value, { req }) => {
            const { current_text, mood, intention } = req.body;
            if (!current_text && !mood && !intention) {
                throw new Error(
                    req.__ ? req.__('ai.prayer_input_required') : 'At least one of current_text, mood, or intention is required'
                );
            }
            return true;
        })
    ],

    // ========================
    // LOCAL GUIDE: Generate Article
    // ========================
    generateArticle: [
        body('topic')
            .notEmpty()
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.topic_required') : 'topic is required'
            )
            .isLength({ min: 2, max: 255 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.topic_length') : 'topic must be between 2 and 255 characters'
            ),

        body('additional_context')
            .optional()
            .isLength({ max: 2000 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.additional_context_too_long') : 'additional_context must not exceed 2000 characters'
            ),

        body('language')
            .optional()
            .isIn(['vi', 'en'])
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.language_invalid') : 'language must be vi or en'
            ),

        body('length')
            .optional()
            .isIn(['short', 'medium', 'long'])
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.length_invalid') : 'length must be short, medium, or long'
            ),

        body('style')
            .optional()
            .isIn(['devotional', 'informational', 'historical', 'youth'])
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.style_invalid') : 'style must be devotional, informational, historical, or youth'
            )
    ],

    // ========================
    // LOCAL GUIDE: Suggest Events
    // ========================
    suggestEvents: [
        body('current_date')
            .optional()
            .isISO8601()
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.current_date_invalid') : 'current_date must be a valid ISO 8601 date'
            ),

        body('count')
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage((value, { req }) =>
                req.__ ? req.__('ai.count_invalid') : 'count must be between 1 and 10'
            )
    ]
};

module.exports = aiValidator;



