const { body } = require('express-validator');

class VerificationValidator {
    // Validate create verification request (Pilgrim)
    static createRequest = [
        body('site_name')
            .notEmpty().withMessage('Tên địa điểm không được để trống')
            .isLength({ min: 2, max: 255 }).withMessage('Tên địa điểm phải từ 2-255 ký tự')
            .trim(),

        body('site_province')
            .notEmpty().withMessage('Tỉnh/Thành không được để trống')
            .isLength({ max: 100 }).withMessage('Tên tỉnh/thành không quá 100 ký tự')
            .trim(),

        body('site_address')
            .optional()
            .isString()
            .trim(),

        body('site_type')
            .optional()
            .isIn(['church', 'shrine', 'monastery', 'center', 'other'])
            .withMessage('Loại địa điểm không hợp lệ'),

        body('site_region')
            .optional()
            .isIn(['Bac', 'Trung', 'Nam'])
            .withMessage('Vùng miền không hợp lệ'),

        body('introduction')
            .optional()
            .isLength({ max: 2000 }).withMessage('Giới thiệu không quá 2000 ký tự')
            .trim()
    ];

    // Validate update status (Admin) - RESTful: status in body
    static updateStatus = [
        body('status')
            .notEmpty().withMessage('Trạng thái không được để trống')
            .isIn(['approved', 'rejected']).withMessage('Trạng thái phải là approved hoặc rejected'),

        body('rejection_reason')
            .if(body('status').equals('rejected'))
            .notEmpty().withMessage('Lý do từ chối không được để trống')
            .isLength({ min: 10, max: 1000 }).withMessage('Lý do từ chối phải từ 10-1000 ký tự')
            .trim()
    ];
}

module.exports = VerificationValidator;
