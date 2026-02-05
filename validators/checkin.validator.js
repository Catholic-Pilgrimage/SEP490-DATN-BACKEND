const { body, param } = require('express-validator');

class CheckinValidator {
    /**
     * Validate check-in request
     */
    static checkin = [
        param('id')
            .isUUID().withMessage('Planner item ID không hợp lệ'),

        body('latitude')
            .notEmpty().withMessage('Latitude không được để trống')
            .isFloat({ min: -90, max: 90 }).withMessage('Latitude phải từ -90 đến 90'),

        body('longitude')
            .notEmpty().withMessage('Longitude không được để trống')
            .isFloat({ min: -180, max: 180 }).withMessage('Longitude phải từ -180 đến 180'),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .isLength({ max: 500 }).withMessage('Ghi chú không quá 500 ký tự')
            .trim()
    ];
}

module.exports = CheckinValidator;
