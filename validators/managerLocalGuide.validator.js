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
}

module.exports = ManagerLocalGuideValidator;
