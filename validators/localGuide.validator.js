const { body } = require('express-validator');

class LocalGuideValidator {

    // Validate upload media (for multipart/form-data)
    static uploadMedia = [
        body('type')
            .notEmpty().withMessage('Loại media không được để trống')
            .isIn(['image', 'video', 'panorama']).withMessage('Loại media phải là image, video hoặc panorama'),

        body('caption')
            .optional()
            .isLength({ max: 255 }).withMessage('Mô tả tối đa 255 ký tự')
            .trim()
    ];
}

module.exports = LocalGuideValidator;
