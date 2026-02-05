const { body, query } = require('express-validator');

class JournalValidator {
    // Validate create journal
    static createJournal = [
        body('title')
            .notEmpty().withMessage('Tiêu đề không được để trống')
            .isLength({ max: 500 }).withMessage('Tiêu đề không quá 500 ký tự')
            .trim(),

        body('content')
            .notEmpty().withMessage('Nội dung không được để trống')
            .trim(),

        body('planner_item_id')
            .notEmpty().withMessage('Planner item ID là bắt buộc')
            .isUUID().withMessage('Planner item ID không hợp lệ'),

        body('privacy')
            .optional()
            .isIn(['private', 'public']).withMessage('Privacy phải là private hoặc public')
    ];

    // Validate update journal
    static updateJournal = [
        body('title')
            .optional()
            .isLength({ max: 500 }).withMessage('Tiêu đề không quá 500 ký tự')
            .trim(),

        body('content')
            .optional()
            .trim(),

        body('site_id')
            .optional()
            .isString().withMessage('Site ID phải là chuỗi'),

        body('privacy')
            .optional()
            .isIn(['private', 'public']).withMessage('Privacy phải là private hoặc public')
    ];

    // Validate filters for public journals
    static getPublicJournals = [
        query('site_id')
            .optional()
            .isUUID().withMessage('Site ID không hợp lệ'),

        query('keyword')
            .optional()
            .isString().withMessage('Keyword phải là chuỗi')
            .trim(),

        query('date')
            .optional()
            .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date phải có định dạng YYYY-MM-DD'),

        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100')
    ];

    // Validate filters for user journals
    static getUserJournals = [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100')
    ];
}

module.exports = JournalValidator;
