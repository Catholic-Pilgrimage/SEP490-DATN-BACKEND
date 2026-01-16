const { body, param } = require('express-validator');

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

    // Validate update media
    static updateMedia = [
        body('type')
            .optional()
            .isIn(['image', 'video', 'panorama'])
            .withMessage('Loại media phải là image, video hoặc panorama'),

        body('caption')
            .optional()
            .isLength({ max: 255 })
            .withMessage('Mô tả tối đa 255 ký tự')
            .trim(),

        body('url')
            .optional()
            .custom((value, { req }) => {

                const mediaType = req.body.type;
                if (mediaType === 'video' && value && !value.includes('cloudinary')) {
                    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
                    if (!youtubeRegex.test(value)) {
                        throw new Error('Link YouTube không hợp lệ');
                    }
                }
                return true;
            })
    ];


    static validateMediaId = [
        param('id')
            .isUUID()
            .withMessage('ID media không hợp lệ')
    ];


    static createSchedule = [
        body('days_of_week')
            .notEmpty().withMessage('Vui lòng chọn ít nhất 1 ngày trong tuần')
            .isArray({ min: 1 }).withMessage('days_of_week phải là mảng có ít nhất 1 phần tử')
            .custom((value) => {
                if (!value.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
                    throw new Error('Mỗi ngày phải là số từ 0-6 (0=CN, 1=T2, ..., 6=T7)');
                }
                return true;
            }),

        body('time')
            .notEmpty().withMessage('Giờ lễ không được để trống')
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ lễ phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        body('note')
            .optional()
            .isLength({ max: 500 }).withMessage('Ghi chú tối đa 500 ký tự')
            .trim()
    ];

    // Validate update schedule
    static updateSchedule = [
        body('days_of_week')
            .optional()
            .isArray({ min: 1 }).withMessage('days_of_week phải là mảng có ít nhất 1 phần tử')
            .custom((value) => {
                if (!value.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) {
                    throw new Error('Mỗi ngày phải là số từ 0-6 (0=CN, 1=T2, ..., 6=T7)');
                }
                return true;
            }),

        body('time')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ lễ phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        body('note')
            .optional()
            .isLength({ max: 500 }).withMessage('Ghi chú tối đa 500 ký tự')
            .trim()
    ];

    // Validate schedule ID param
    static validateScheduleId = [
        param('id')
            .isUUID()
            .withMessage('ID lịch lễ không hợp lệ')
    ];
}

module.exports = LocalGuideValidator;
