const { body } = require('express-validator');

class ManagerLocalGuideValidator {
    // Validate create Local Guide
    static createLocalGuide = [
        body('email')
            .notEmpty().withMessage('Email không được để trống')
            .isEmail().withMessage('Email không hợp lệ')
            .normalizeEmail(),

        body('full_name')
            .notEmpty().withMessage('Họ tên không được để trống')
            .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
            .trim(),

        body('phone')
            .optional()
            .matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ')
            .trim()
    ];

    // Validate update status (block/unblock)
    static updateStatus = [
        body('status')
            .notEmpty().withMessage('Trạng thái không được để trống')
            .isIn(['active', 'banned']).withMessage('Trạng thái phải là active hoặc banned')
    ];

    // Validate update submission status (approve/reject)
    static updateSubmissionStatus = [
        body('status')
            .notEmpty().withMessage('Trạng thái không được để trống')
            .isIn(['approved', 'rejected']).withMessage('Trạng thái phải là approved hoặc rejected'),

        body('rejection_reason')
            .if(body('status').equals('rejected'))
            .notEmpty().withMessage('Lý do từ chối không được để trống khi reject')
            .isString().withMessage('Lý do từ chối phải là chuỗi')
            .isLength({ min: 1, max: 500 }).withMessage('Lý do từ chối phải từ 1-500 ký tự')
            .trim()
    ];
}

module.exports = ManagerLocalGuideValidator;
