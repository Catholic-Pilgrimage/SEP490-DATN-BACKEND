const { body, query, param } = require('express-validator');

class PlannerValidator {
    // Validate create planner
    static createPlanner = [
        body('name')
            .notEmpty().withMessage('Tên kế hoạch không được để trống')
            .isLength({ max: 255 }).withMessage('Tên kế hoạch không quá 255 ký tự')
            .trim(),

        body('start_date')
            .optional()
            .isISO8601().withMessage('Ngày bắt đầu phải có định dạng YYYY-MM-DD')
            .custom((value) => {
                if (value) {
                    const inputDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (inputDate < today) {
                        throw new Error('Ngày bắt đầu không được là ngày trong quá khứ');
                    }
                }
                return true;
            }),

        body('end_date')
            .optional()
            .isISO8601().withMessage('Ngày kết thúc phải có định dạng YYYY-MM-DD')
            .custom((value, { req }) => {
                if (value && req.body.start_date) {
                    const startDate = new Date(req.body.start_date);
                    const endDate = new Date(value);
                    if (endDate < startDate) {
                        throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
                    }
                }
                return true;
            }),

        body('number_of_people')
            .optional()
            .isInt({ min: 1 }).withMessage('Số người phải lớn hơn hoặc bằng 1'),

        body('transportation')
            .optional()
            .isIn(['motorbike', 'car', 'bus']).withMessage('Phương tiện phải là motorbike, car hoặc bus'),

        body('budget_level')
            .optional()
            .isIn(['budget', 'standard', 'luxury']).withMessage('Mức ngân sách phải là tiết kiệm, tiêu chuẩn hoặc sang trọng')
    ];

    // Validate update planner
    static updatePlanner = [
        body('name')
            .optional()
            .isLength({ max: 255 }).withMessage('Tên kế hoạch không quá 255 ký tự')
            .trim(),

        body('start_date')
            .optional()
            .isISO8601().withMessage('Ngày bắt đầu phải có định dạng YYYY-MM-DD')
            .custom((value) => {
                if (value) {
                    const inputDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (inputDate < today) {
                        throw new Error('Ngày bắt đầu không được là ngày trong quá khứ');
                    }
                }
                return true;
            }),

        body('end_date')
            .optional()
            .isISO8601().withMessage('Ngày kết thúc phải có định dạng YYYY-MM-DD'),

        body('number_of_people')
            .optional()
            .isInt({ min: 1 }).withMessage('Số người phải lớn hơn hoặc bằng 1'),

        body('transportation')
            .optional()
            .isIn(['motorbike', 'car', 'bus']).withMessage('Phương tiện phải là motorbike, car hoặc bus'),

        body('budget_level')
            .optional()
            .isIn(['budget', 'standard', 'luxury']).withMessage('Mức ngân sách phải là budget, standard hoặc luxury'),

        body('status')
            .optional()
            .isIn(['planning', 'ongoing', 'completed']).withMessage('Trạng thái phải là planning, ongoing hoặc completed')
    ];

    // Validate add planner item
    static addPlannerItem = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('site_id')
            .notEmpty().withMessage('Site ID không được để trống')
            .isUUID().withMessage('Site ID không hợp lệ'),

        body('day_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .trim()
    ];

    // Validate reorder items
    static reorderItems = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('day_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('item_ids')
            .notEmpty().withMessage('Danh sách item IDs không được để trống')
            .isArray({ min: 1 }).withMessage('Danh sách item IDs phải là mảng và không rỗng')
            .custom((value) => {
                if (!value.every(id => typeof id === 'string')) {
                    throw new Error('Tất cả item IDs phải là chuỗi UUID');
                }
                return true;
            })
    ];

    // Validate delete item
    static deleteItem = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        param('itemId')
            .isUUID().withMessage('Item ID không hợp lệ')
    ];

    // Validate get planners query
    static getUserPlanners = [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100')
    ];

    // Validate planner ID param
    static validatePlannerId = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ')
    ];

    // Validate create share token
    static createShareToken = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('role')
            .optional()
            .isIn(['viewer', 'editor']).withMessage('Role phải là viewer hoặc editor')
    ];

    // Validate share token param
    static validateShareToken = [
        param('token')
            .notEmpty().withMessage('Token không được để trống')
            .isString().withMessage('Token phải là chuỗi')
    ];

    // Validate add item by token
    static addItemByToken = [
        param('token')
            .notEmpty().withMessage('Token không được để trống'),

        body('site_id')
            .notEmpty().withMessage('Site ID không được để trống')
            .isUUID().withMessage('Site ID không hợp lệ'),

        body('day_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .trim()
    ];

    // Validate reorder items by token
    static reorderItemsByToken = [
        param('token')
            .notEmpty().withMessage('Token không được để trống'),

        body('day_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('item_ids')
            .notEmpty().withMessage('Danh sách item IDs không được để trống')
            .isArray({ min: 1 }).withMessage('Danh sách item IDs phải là mảng và không rỗng')
            .custom((value) => {
                if (!value.every(id => typeof id === 'string')) {
                    throw new Error('Tất cả item IDs phải là chuỗi UUID');
                }
                return true;
            })
    ];

    // Validate update share role
    static updateShareRole = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('role')
            .notEmpty().withMessage('Role không được để trống')
            .isIn(['viewer', 'editor']).withMessage('Role phải là viewer hoặc editor')
    ];
}

module.exports = PlannerValidator;
