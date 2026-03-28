const { body, param, query } = require('express-validator');

const reportValidator = {
  // Tạo report mới
  createReport: [
    body('target_type')
      .notEmpty()
      .withMessage('Target type is required')
      .isIn(['post', 'comment', 'journal', 'site_review', 'nearby_place_review'])
      .withMessage('Target type must be post, comment, journal, site_review, or nearby_place_review'),

    body('target_id')
      .notEmpty()
      .withMessage('Target ID is required')
      .isUUID()
      .withMessage('Invalid target ID format'),

    body('reason')
      .notEmpty()
      .withMessage('Reason is required')
      .isIn(['spam', 'harassment', 'hate_speech', 'false_information', 'violence', 'inappropriate', 'other'])
      .withMessage('Invalid reason'),

    body('description')
      .optional({ nullable: true, checkFalsy: true })
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
  ],

  // Get reports (admin)
  getReports: [
    query('status')
      .optional({ nullable: true, checkFalsy: true })
      .isIn(['pending', 'resolved', 'reject'])
      .withMessage('Invalid status'),

    query('target_type')
      .optional({ nullable: true, checkFalsy: true })
      .isIn(['post', 'comment', 'journal', 'site_review', 'nearby_place_review'])
      .withMessage('Invalid target type'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Resolve report (admin)
  resolveReport: [
    param('id')
      .isUUID()
      .withMessage('Invalid report ID'),

    body('action')
      .notEmpty()
      .withMessage('Action is required')
      .isIn(['resolved', 'reject'])
      .withMessage('Action must be resolved or reject'),

    body('note')
      .optional({ nullable: true, checkFalsy: true })
      .isLength({ max: 500 })
      .withMessage('Note cannot exceed 500 characters')
  ],

  // Get my reports
  getMyReports: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  reportId: [
    param('id')
      .isUUID()
      .withMessage('Invalid report ID')
  ]
};

module.exports = reportValidator;
