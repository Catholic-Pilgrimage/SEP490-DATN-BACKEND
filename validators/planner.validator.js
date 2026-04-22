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
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);

                    if (inputDate < tomorrow) {
                        throw new Error('Ngày bắt đầu phải từ ngày mai trở đi');
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

        body('min_people_required')
            .optional()
            .isInt({ min: 1 }).withMessage('Số người tối thiểu phải lớn hơn hoặc bằng 1')
            .custom((value, { req }) => {
                const maxPeople = req.body.number_of_people !== undefined
                    ? parseInt(req.body.number_of_people)
                    : 1;
                if (parseInt(value) > maxPeople) {
                    throw new Error('Số người tối thiểu không được lớn hơn số người tối đa');
                }
                return true;
            }),

        body('transportation')
            .optional()
            .isIn(['motorbike', 'car', 'bus']).withMessage('Phương tiện phải là motorbike, car hoặc bus'),

        body('deposit_amount')
            .optional()
            .isFloat({ min: 0, max: 50000000 }).withMessage('Số tiền đặt cọc phải từ 0 đến 50,000,000 VND')
            .custom((value, { req }) => {
                const numPeople = parseInt(req.body.number_of_people) || 1;
                if (numPeople === 1 && parseFloat(value) > 0) {
                    throw new Error('Không thể đặt tiền cọc khi đi một mình (số người = 1)');
                }
                return true;
            }),

        body('penalty_percentage')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Tỷ lệ phạt phải từ 0 đến 100%')
            .custom((value, { req }) => {
                const numPeople = parseInt(req.body.number_of_people) || 1;
                if (numPeople === 1 && parseInt(value) > 0) {
                    throw new Error('Không thể đặt tỷ lệ phạt khi đi một mình (số người = 1)');
                }
                return true;
            }),

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
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);

                    if (inputDate < tomorrow) {
                        throw new Error('Ngày bắt đầu phải từ ngày mai trở đi');
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

        body('min_people_required')
            .optional()
            .isInt({ min: 1 }).withMessage('Số người tối thiểu phải lớn hơn hoặc bằng 1')
            .custom((value, { req }) => {
                if (req.body.number_of_people !== undefined && parseInt(value) > parseInt(req.body.number_of_people)) {
                    throw new Error('Số người tối thiểu không được lớn hơn số người tối đa');
                }
                return true;
            }),

        body('transportation')
            .optional()
            .isIn(['motorbike', 'car', 'bus']).withMessage('Phương tiện phải là motorbike, car hoặc bus'),

        body('status')
            .optional()
            .isIn(['planning', 'ongoing', 'completed']).withMessage('Trạng thái phải là planning, ongoing hoặc completed'),

        body('deposit_amount')
            .optional()
            .isFloat({ min: 0, max: 50000000 }).withMessage('Số tiền đặt cọc phải từ 0 đến 50,000,000 VND')
            .custom((value, { req }) => {
                // Only block if request explicitly sends number_of_people = 1
                // If number_of_people is omitted, service will use the DB value
                const numPeople = req.body.number_of_people !== undefined
                    ? parseInt(req.body.number_of_people)
                    : null;
                if (numPeople === 1 && parseFloat(value) > 0) {
                    throw new Error('Solo planner cannot have a deposit amount');
                }
                return true;
            }),

        body('penalty_percentage')
            .optional()
            .isInt({ min: 0, max: 100 }).withMessage('Tỷ lệ phạt phải từ 0 đến 100%')
            .custom((value, { req }) => {
                const numPeople = req.body.number_of_people !== undefined
                    ? parseInt(req.body.number_of_people)
                    : null;
                if (numPeople === 1 && parseInt(value) > 0) {
                    throw new Error('Solo planner cannot have a penalty percentage');
                }
                return true;
            }),

        body('edit_lock_at')
            .optional({ nullable: true })
            .isISO8601().withMessage('Thời gian khóa chỉnh sửa phải có định dạng quốc tế')
            .toDate()
    ];

    // Validate add planner item
    static addPlannerItem = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('site_id')
            .notEmpty().withMessage('Site ID không được để trống')
            .isUUID().withMessage('Site ID không hợp lệ'),
        body('leg_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('event_id')
            .optional({ nullable: true })
            .isUUID().withMessage('Event ID không hợp lệ'),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .trim(),

        body('nearby_amenity_ids')
            .optional()
            .isArray().withMessage('Danh sách tiện ích phải là mảng')
            .custom((value) => {
                if (value && !value.every(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
                    throw new Error('Tất cả nearby amenity IDs phải là UUID hợp lệ');
                }
                return true;
            }),

        body('estimated_time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Giờ dự kiến phải có định dạng HH:MM (ví dụ: 09:00, 14:30)'),

        body('travel_time_minutes')
            .optional()
            .isInt({ min: 0 }).withMessage('Thời gian di chuyển phải là số nguyên không âm'),

        body('rest_duration')
            .notEmpty().withMessage('Thời gian nghỉ ngơi không được để trống')
            .isString().withMessage('Thời gian nghỉ phải là chuỗi')
            .trim()
            .custom((value) => {
                // Regex cho format đơn giản ("2 hours", "30 minutes") hoặc phức hợp ("2 hours 45 minutes")
                const simpleMatch = value.match(/^(\d+)\s+(hour|hours|minute|minutes|min|mins)$/i);
                const complexMatch = value.match(/^(\d+)\s+(hour|hours)\s+(\d+)\s+(minute|minutes|min|mins)$/i);

                let totalMinutes = 0;

                if (complexMatch) {
                    // Format: "2 hours 45 minutes"
                    const hours = parseInt(complexMatch[1]);
                    const minutes = parseInt(complexMatch[3]);
                    totalMinutes = hours * 60 + minutes;
                } else if (simpleMatch) {
                    // Format: "2 hours" hoặc "90 minutes"
                    const num = parseInt(simpleMatch[1]);
                    const unit = simpleMatch[2].toLowerCase();
                    totalMinutes = unit.startsWith('hour') ? num * 60 : num;
                } else {
                    throw new Error('Thời gian nghỉ phải có định dạng như: "1 hour", "30 minutes", "2 hours 45 minutes"');
                }

                if (totalMinutes < 60) {
                    throw new Error('Thời gian nghỉ ngơi tại địa điểm phải tối thiểu 1 tiếng');
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

    // Validate update planner item
    static updatePlannerItem = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        param('itemId')
            .isUUID().withMessage('Item ID không hợp lệ'),

        body('estimated_time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Giờ dự kiến phải có định dạng HH:MM (ví dụ: 09:00, 14:30)'),

        body('rest_duration')
            .optional()
            .isString().withMessage('Thời gian nghỉ phải là chuỗi')
            .trim()
            .custom((value) => {
                if (!value) return true;
                // Regex cho format đơn giản ("2 hours", "30 minutes") hoặc phức hợp ("2 hours 45 minutes")
                const simpleMatch = value.match(/^(\d+)\s+(hour|hours|minute|minutes|min|mins)$/i);
                const complexMatch = value.match(/^(\d+)\s+(hour|hours)\s+(\d+)\s+(minute|minutes|min|mins)$/i);

                let totalMinutes = 0;

                if (complexMatch) {
                    // Format: "2 hours 45 minutes"
                    const hours = parseInt(complexMatch[1]);
                    const minutes = parseInt(complexMatch[3]);
                    totalMinutes = hours * 60 + minutes;
                } else if (simpleMatch) {
                    // Format: "2 hours" hoặc "90 minutes"
                    const num = parseInt(simpleMatch[1]);
                    const unit = simpleMatch[2].toLowerCase();
                    totalMinutes = unit.startsWith('hour') ? num * 60 : num;
                } else {
                    throw new Error('Thời gian nghỉ phải có định dạng như: "1 hour", "30 minutes", "2 hours 45 minutes"');
                }

                if (totalMinutes < 60) {
                    throw new Error('Thời gian nghỉ ngơi tại địa điểm phải tối thiểu 1 tiếng');
                }
                return true;
            }),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .trim(),

        body('nearby_amenity_ids')
            .optional()
            .isArray().withMessage('Danh sách tiện ích phải là mảng')
            .custom((value) => {
                if (value && !value.every(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
                    throw new Error('Tất cả nearby amenity IDs phải là UUID hợp lệ');
                }
                return true;
            }),

        body('travel_time_minutes')
            .optional()
            .isInt({ min: 0 }).withMessage('Thời gian di chuyển phải là số nguyên không âm')
    ];

    // Validate get planners query
    static getUserPlanners = [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),

        query('status')
            .optional()
            .isIn(['planning', 'locked', 'ongoing', 'completed', 'cancelled'])
            .withMessage('Status phải là planning, ongoing, completed hoặc cancelled')
    ];

    // Validate planner ID param
    static validatePlannerId = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ')
    ];

    static emergencyStopPlanner = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('cancelled_reason')
            .notEmpty().withMessage('Lý do dừng khẩn cấp không được để trống')
            .isString().withMessage('Lý do dừng khẩn cấp phải là chuỗi')
            .trim()
            .isLength({ min: 5, max: 1000 }).withMessage('Lý do dừng khẩn cấp phải từ 5 đến 1000 ký tự'),

        body('reason')
            .optional()
            .isString().withMessage('Lý do dừng khẩn cấp phải là chuỗi')
            .trim()
            .isLength({ min: 5, max: 1000 }).withMessage('Lý do dừng khẩn cấp phải từ 5 đến 1000 ký tự')
    ];

    static sharePlanner = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('content')
            .optional({ values: 'falsy' })
            .isString().withMessage('Nội dung chia sẻ phải là chuỗi')
            .trim()
            .isLength({ min: 1, max: 10000 }).withMessage('Nội dung chia sẻ phải từ 1 đến 10000 ký tự')
    ];

    static clonePlanner = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('name')
            .optional()
            .isLength({ max: 255 }).withMessage('Tạo lại tên kế hoạch không quá 255 ký tự')
            .trim(),

        body('start_date')
            .optional()
            .isISO8601().withMessage('Ngày bắt đầu phải có định dạng YYYY-MM-DD')
            .custom((value) => {
                if (value) {
                    const inputDate = new Date(value);
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(0, 0, 0, 0);

                    if (inputDate < tomorrow) {
                        throw new Error('Ngày bắt đầu kế hoạch phải từ ngày mai trở đi');
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
            .isIn(['motorbike', 'car', 'bus']).withMessage('Phương tiện phải là motorbike, car hoặc bus')
    ];

    // Validate create share token
    static createShareToken = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ')
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

        body('leg_number')
            .notEmpty().withMessage('Số ngày không được để trống')
            .isInt({ min: 1 }).withMessage('Số ngày phải lớn hơn hoặc bằng 1'),

        body('note')
            .optional()
            .isString().withMessage('Ghi chú phải là chuỗi')
            .trim(),

        body('nearby_amenity_ids')
            .optional()
            .isArray().withMessage('Danh sách tiện ích phải là mảng')
            .custom((value) => {
                if (value && !value.every(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
                    throw new Error('Tất cả nearby amenity IDs phải là UUID hợp lệ');
                }
                return true;
            }),

        body('estimated_time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Giờ dự kiến phải có định dạng HH:MM (ví dụ: 09:00, 14:30)'),

        body('rest_duration')
            .notEmpty().withMessage('Thời gian nghỉ ngơi không được để trống')
            .isString().withMessage('Thời gian nghỉ phải là chuỗi')
            .trim()
            .custom((value) => {
                // Regex cho format đơn giản ("2 hours", "30 minutes") hoặc phức hợp ("2 hours 45 minutes")
                const simpleMatch = value.match(/^(\d+)\s+(hour|hours|minute|minutes|min|mins)$/i);
                const complexMatch = value.match(/^(\d+)\s+(hour|hours)\s+(\d+)\s+(minute|minutes|min|mins)$/i);

                let totalMinutes = 0;

                if (complexMatch) {
                    // Format: "2 hours 45 minutes"
                    const hours = parseInt(complexMatch[1]);
                    const minutes = parseInt(complexMatch[3]);
                    totalMinutes = hours * 60 + minutes;
                } else if (simpleMatch) {
                    // Format: "2 hours" hoặc "90 minutes"
                    const num = parseInt(simpleMatch[1]);
                    const unit = simpleMatch[2].toLowerCase();
                    totalMinutes = unit.startsWith('hour') ? num * 60 : num;
                } else {
                    throw new Error('Thời gian nghỉ phải có định dạng như: "1 hour", "30 minutes", "2 hours 45 minutes"');
                }

                if (totalMinutes < 60) {
                    throw new Error('Thời gian nghỉ ngơi tại địa điểm phải tối thiểu 1 tiếng');
                }
                return true;
            })
    ];

    // Validate reorder items by token
    static reorderItemsByToken = [
        param('token')
            .notEmpty().withMessage('Token không được để trống'),

        body('leg_number')
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


    // Validate invite user to planner
    static inviteUser = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('email')
            .notEmpty().withMessage('Email không được để trống')
            .isEmail().withMessage('Email không hợp lệ')
            .normalizeEmail()
    ];

    // Validate respond to invite
    static respondToInvite = [
        param('token')
            .notEmpty().withMessage('Token không được để trống')
            .isString().withMessage('Token phải là chuỗi'),

        body('action')
            .notEmpty().withMessage('Action không được để trống')
            .isIn(['accept', 'reject']).withMessage('Action phải là accept hoặc reject')
    ];

    // Validate invite friend (no deposit)
    static inviteFriend = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('friend_id')
            .notEmpty().withMessage('Friend ID không được để trống')
            .isUUID().withMessage('Friend ID không hợp lệ')
    ];

    // Validate swap planner items
    static swapPlannerItems = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        body('item_id_a')
            .notEmpty().withMessage('Item A ID không được để trống')
            .isUUID().withMessage('Item A ID không hợp lệ'),

        body('item_id_b')
            .notEmpty().withMessage('Item B ID không được để trống')
            .isUUID().withMessage('Item B ID không hợp lệ')
            .custom((value, { req }) => {
                if (value === req.body.item_id_a) {
                    throw new Error('Hai item đổi chỗ phải khác nhau');
                }
                return true;
            }),

        body('affected_days')
            .isArray({ min: 1, max: 2 }).withMessage('affected_days phải là mảng có 1 hoặc 2 phần tử')
            .custom((value) => {
                // Check no duplicate leg_number
                const legs = value.map(d => d.leg_number);
                if (new Set(legs).size !== legs.length) {
                    throw new Error('Không được trùng leg_number trong affected_days');
                }

                // Check no duplicate item id across all days
                const allIds = value.flatMap(d => (d.items || []).map(i => i.id));
                if (new Set(allIds).size !== allIds.length) {
                    throw new Error('Không được trùng item ID giữa các ngày');
                }

                return true;
            }),

        body('affected_days.*.leg_number')
            .isInt({ min: 1 }).withMessage('leg_number phải là số nguyên >= 1'),

        body('affected_days.*.items')
            .isArray({ min: 1 }).withMessage('Mỗi ngày phải có ít nhất 1 item'),

        body('affected_days.*.items.*.id')
            .isUUID().withMessage('Item ID không hợp lệ'),

        body('affected_days.*.items.*.estimated_time')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('estimated_time phải có định dạng HH:MM'),

        body('affected_days.*.items.*.travel_time_minutes')
            .isInt({ min: 0 }).withMessage('travel_time_minutes phải là số nguyên không âm')
    ];

    // Validate remove member
    static removeMember = [
        param('id')
            .isUUID().withMessage('Planner ID không hợp lệ'),

        param('memberId')
            .isUUID().withMessage('Member ID không hợp lệ')
    ];
}

module.exports = PlannerValidator;

