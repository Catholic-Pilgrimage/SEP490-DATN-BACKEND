const { body, param } = require('express-validator');

class LocalGuideValidator {

    // Validate upload media (for multipart/form-data)
    static uploadMedia = [
        body('type')
            .notEmpty().withMessage('Loại media không được để trống')
            .isIn(['image', 'video']).withMessage('Loại media phải là image hoặc video'),

        body('caption')
            .optional()
            .isLength({ max: 255 }).withMessage('Mô tả tối đa 255 ký tự')
            .trim()
    ];

    // Validate update media
    static updateMedia = [
        body('type')
            .optional()
            .isIn(['image', 'video'])
            .withMessage('Loại media phải là image hoặc video'),

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

    static validateScheduleId = [
        param('id')
            .isUUID()
            .withMessage('ID lịch lễ không hợp lệ')
    ];

    // ===================== EVENT VALIDATORS =====================

    static createEvent = [
        body('name')
            .notEmpty().withMessage('Tên sự kiện không được để trống')
            .isLength({ max: 255 }).withMessage('Tên sự kiện tối đa 255 ký tự')
            .trim(),

        body('description')
            .optional()
            .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự')
            .trim(),

        body('start_date')
            .notEmpty().withMessage('Ngày bắt đầu không được để trống')
            .isDate().withMessage('Ngày bắt đầu phải đúng định dạng YYYY-MM-DD')
            .custom((value) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const startDate = new Date(value);
                if (startDate < today) {
                    throw new Error('Ngày bắt đầu không được ở trong quá khứ');
                }
                return true;
            }),

        body('end_date')
            .optional()
            .isDate().withMessage('Ngày kết thúc phải đúng định dạng YYYY-MM-DD')
            .custom((value, { req }) => {
                if (value && req.body.start_date && value < req.body.start_date) {
                    throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
                }
                return true;
            }),

        body('start_time')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM'),

        body('end_time')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM')
            .custom((value, { req }) => {
                const { start_date, end_date, start_time } = req.body;
                // If same day (no end_date or end_date = start_date) and both times provided
                const isSameDay = !end_date || end_date === start_date;
                if (isSameDay && start_time && value && start_time >= value) {
                    throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
                }
                return true;
            }),

        body('location')
            .optional()
            .isLength({ max: 255 }).withMessage('Địa điểm tối đa 255 ký tự')
            .trim(),

        body('category')
            .optional()
            .isString().withMessage('Phân loại phải là chuỗi')
            .isLength({ max: 100 }).withMessage('Phân loại tối đa 100 ký tự')
            .trim()
    ];

    static updateEvent = [
        body('name')
            .optional()
            .isLength({ max: 255 }).withMessage('Tên sự kiện tối đa 255 ký tự')
            .trim(),

        body('description')
            .optional()
            .isLength({ max: 2000 }).withMessage('Mô tả tối đa 2000 ký tự')
            .trim(),

        body('start_date')
            .optional()
            .isDate().withMessage('Ngày bắt đầu phải đúng định dạng YYYY-MM-DD')
            .custom((value) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const startDate = new Date(value);
                if (startDate < today) {
                    throw new Error('Ngày bắt đầu không được ở trong quá khứ');
                }
                return true;
            }),

        body('end_date')
            .optional()
            .isDate().withMessage('Ngày kết thúc phải đúng định dạng YYYY-MM-DD')
            .custom((value, { req }) => {
                const startDate = req.body.start_date;
                if (value && startDate && value < startDate) {
                    throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
                }
                return true;
            }),

        body('start_time')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM'),

        body('end_time')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM')
            .custom((value, { req }) => {
                const { start_date, end_date, start_time } = req.body;

                const isSameDay = !end_date || end_date === start_date;
                if (isSameDay && start_time && value && start_time >= value) {
                    throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
                }
                return true;
            }),

        body('location')
            .optional()
            .isLength({ max: 255 }).withMessage('Địa điểm tối đa 255 ký tự')
            .trim(),

        body('category')
            .optional()
            .isString().withMessage('Phân loại phải là chuỗi')
            .isLength({ max: 100 }).withMessage('Phân loại tối đa 100 ký tự')
            .trim()
    ];

    static validateEventId = [
        param('id')
            .isUUID()
            .withMessage('ID sự kiện không hợp lệ')
    ];

    // ===================== SHIFT VALIDATORS =====================

    static createShiftSubmission = [
        body('week_start_date')
            .notEmpty().withMessage('Ngày đầu tuần không được để trống')
            .isDate().withMessage('Ngày đầu tuần phải đúng định dạng YYYY-MM-DD'),

        body('shifts')
            .isArray({ min: 3, max: 21 }).withMessage('Phải đăng ký từ 3-21 ca mỗi tuần'),

        body('shifts.*.day_of_week')
            .isInt({ min: 0, max: 6 }).withMessage('Ngày trong tuần không hợp lệ (0-6)'),

        body('shifts.*.start_time')
            .notEmpty().withMessage('Giờ bắt đầu không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        body('shifts.*.end_time')
            .notEmpty().withMessage('Giờ kết thúc không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        body('previous_submission_id')
            .optional()
            .isUUID().withMessage('previous_submission_id không hợp lệ'),

        body('change_reason')
            .if(body('previous_submission_id').exists())
            .notEmpty().withMessage('change_reason bắt buộc khi cập nhật lịch đã approved'),

        // Validate shift duration and constraints
        body('shifts').custom((shifts) => {
            if (!Array.isArray(shifts)) return true;

            const shiftsPerDay = {};
            const MIN_DURATION = 2;
            const MAX_DURATION = 8;
            const MAX_SHIFTS_PER_DAY = 3;
            const MIN_BREAK_MINUTES = 30;

            for (let i = 0; i < shifts.length; i++) {
                const { day_of_week, start_time, end_time } = shifts[i];

                // Validate duration
                const normalizeTime = (time) => time.length === 5 ? `${time}:00` : time;
                const start = new Date(`1970-01-01T${normalizeTime(start_time)}`);
                const end = new Date(`1970-01-01T${normalizeTime(end_time)}`);
                let durationHours = (end - start) / (1000 * 60 * 60);
                if (durationHours < 0) durationHours += 24;

                if (durationHours < MIN_DURATION) {
                    throw new Error(`Ca ${i + 1}: Mỗi ca phải ít nhất ${MIN_DURATION} giờ`);
                }
                if (durationHours > MAX_DURATION) {
                    throw new Error(`Ca ${i + 1}: Mỗi ca không được quá ${MAX_DURATION} giờ`);
                }

                // Track shifts per day
                if (!shiftsPerDay[day_of_week]) {
                    shiftsPerDay[day_of_week] = [];
                }
                shiftsPerDay[day_of_week].push({
                    start_time: normalizeTime(start_time),
                    end_time: normalizeTime(end_time),
                    index: i
                });
            }

            // Validate shifts per day
            for (const [day, dayShifts] of Object.entries(shiftsPerDay)) {
                if (dayShifts.length > MAX_SHIFTS_PER_DAY) {
                    throw new Error(`Ngày ${day}: Không được đăng ký quá ${MAX_SHIFTS_PER_DAY} ca mỗi ngày`);
                }

                // Validate break time between shifts
                if (dayShifts.length > 1) {
                    const sorted = dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const currentEnd = new Date(`1970-01-01T${sorted[i].end_time}`);
                        const nextStart = new Date(`1970-01-01T${sorted[i + 1].start_time}`);
                        const breakMinutes = (nextStart - currentEnd) / (1000 * 60);

                        if (breakMinutes < MIN_BREAK_MINUTES) {
                            throw new Error(`Ngày ${day}: Phải có ít nhất ${MIN_BREAK_MINUTES} phút nghỉ giữa các ca`);
                        }
                    }
                }
            }

            return true;
        })
    ];

    static updateShiftSubmission = [
        body('shifts')
            .isArray({ min: 3, max: 21 }).withMessage('Phải đăng ký từ 3-21 ca mỗi tuần'),

        body('shifts.*.day_of_week')
            .isInt({ min: 0, max: 6 }).withMessage('Ngày trong tuần không hợp lệ (0-6)'),

        body('shifts.*.start_time')
            .notEmpty().withMessage('Giờ bắt đầu không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        body('shifts.*.end_time')
            .notEmpty().withMessage('Giờ kết thúc không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        // Validate shift duration and constraints (same as createShiftSubmission)
        body('shifts').custom((shifts) => {
            if (!Array.isArray(shifts)) return true;

            const shiftsPerDay = {};
            const MIN_DURATION = 2;
            const MAX_DURATION = 8;
            const MAX_SHIFTS_PER_DAY = 3;
            const MIN_BREAK_MINUTES = 30;

            for (let i = 0; i < shifts.length; i++) {
                const { day_of_week, start_time, end_time } = shifts[i];

                const normalizeTime = (time) => time.length === 5 ? `${time}:00` : time;
                const start = new Date(`1970-01-01T${normalizeTime(start_time)}`);
                const end = new Date(`1970-01-01T${normalizeTime(end_time)}`);
                let durationHours = (end - start) / (1000 * 60 * 60);
                if (durationHours < 0) durationHours += 24;

                if (durationHours < MIN_DURATION) {
                    throw new Error(`Ca ${i + 1}: Mỗi ca phải ít nhất ${MIN_DURATION} giờ`);
                }
                if (durationHours > MAX_DURATION) {
                    throw new Error(`Ca ${i + 1}: Mỗi ca không được quá ${MAX_DURATION} giờ`);
                }

                if (!shiftsPerDay[day_of_week]) {
                    shiftsPerDay[day_of_week] = [];
                }
                shiftsPerDay[day_of_week].push({
                    start_time: normalizeTime(start_time),
                    end_time: normalizeTime(end_time),
                    index: i
                });
            }

            for (const [day, dayShifts] of Object.entries(shiftsPerDay)) {
                if (dayShifts.length > MAX_SHIFTS_PER_DAY) {
                    throw new Error(`Ngày ${day}: Không được đăng ký quá ${MAX_SHIFTS_PER_DAY} ca mỗi ngày`);
                }

                if (dayShifts.length > 1) {
                    const sorted = dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const currentEnd = new Date(`1970-01-01T${sorted[i].end_time}`);
                        const nextStart = new Date(`1970-01-01T${sorted[i + 1].start_time}`);
                        const breakMinutes = (nextStart - currentEnd) / (1000 * 60);

                        if (breakMinutes < MIN_BREAK_MINUTES) {
                            throw new Error(`Ngày ${day}: Phải có ít nhất ${MIN_BREAK_MINUTES} phút nghỉ giữa các ca`);
                        }
                    }
                }
            }

            return true;
        })
    ];

    static validateShiftSubmissionId = [
        param('id')
            .isUUID()
            .withMessage('ID submission không hợp lệ')
    ];

    static createShift = [
        body('shifts')
            .isArray({ min: 1 }).withMessage('shifts phải là mảng có ít nhất 1 phần tử'),
        body('shifts.*.day_of_week')
            .isInt({ min: 0, max: 6 }).withMessage('Ngày trong tuần không hợp lệ (0-6)'),
        body('shifts.*.start_time')
            .notEmpty().withMessage('Giờ bắt đầu không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM hoặc HH:MM:SS'),
        body('shifts.*.end_time')
            .notEmpty().withMessage('Giờ kết thúc không được để trống')
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        // Custom check: start_time < end_time for each shift
        body('shifts').custom((shifts) => {
            if (!Array.isArray(shifts)) return true;
            for (let i = 0; i < shifts.length; i++) {
                const { start_time, end_time } = shifts[i];
                if (start_time && end_time && start_time >= end_time) {
                    throw new Error(`Ca ${i + 1}: Giờ bắt đầu phải nhỏ hơn giờ kết thúc`);
                }
            }
            return true;
        })
    ];

    static updateShift = [
        body('day_of_week')
            .optional()
            .isInt({ min: 0, max: 6 }).withMessage('Ngày trong tuần không hợp lệ (0-6)'),
        body('start_time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ bắt đầu phải đúng định dạng HH:MM hoặc HH:MM:SS'),
        body('end_time')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
            .withMessage('Giờ kết thúc phải đúng định dạng HH:MM hoặc HH:MM:SS'),

        // Custom check if both provided or mixed
        body().custom((value) => {
            const { start_time, end_time } = value;
            if (start_time && end_time && start_time >= end_time) {
                throw new Error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
            }
            return true;
        })
    ];

    static validateShiftId = [
        param('id')
            .isUUID()
            .withMessage('ID ca làm không hợp lệ')
    ];

    // ===================== NEARBY PLACE VALIDATORS =====================

    static createNearbyPlace = [
        body('name')
            .notEmpty().withMessage('Tên địa điểm không được để trống')
            .isLength({ min: 2, max: 255 }).withMessage('Tên địa điểm phải từ 2-255 ký tự')
            .trim(),
        body('category')
            .notEmpty().withMessage('Danh mục không được để trống')
            .isIn(['food', 'lodging', 'medical']).withMessage('Danh mục không hợp lệ'),
        body('latitude')
            .notEmpty().withMessage('Vĩ độ không được để trống')
            .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),
        body('longitude')
            .notEmpty().withMessage('Kinh độ không được để trống')
            .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),
        body('address')
            .optional()
            .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự')
            .trim(),
        body('phone')
            .optional()
            .isLength({ max: 20 }).withMessage('Số điện thoại tối đa 20 ký tự')
            .trim(),
        body('description')
            .optional()
            .isLength({ max: 1000 }).withMessage('Mô tả tối đa 1000 ký tự')
            .trim()
    ];

    static updateNearbyPlace = [
        param('id')
            .isUUID().withMessage('ID địa điểm không hợp lệ'),
        body('name')
            .optional()
            .isLength({ min: 2, max: 255 }).withMessage('Tên địa điểm phải từ 2-255 ký tự')
            .trim(),
        body('category')
            .optional()
            .isIn(['food', 'lodging', 'medical']).withMessage('Danh mục không hợp lệ'),
        body('latitude')
            .optional()
            .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),
        body('longitude')
            .optional()
            .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),
        body('address')
            .optional()
            .isLength({ max: 500 }).withMessage('Địa chỉ tối đa 500 ký tự')
            .trim(),
        body('phone')
            .optional()
            .isLength({ max: 20 }).withMessage('Số điện thoại tối đa 20 ký tự')
            .trim(),
        body('description')
            .optional()
            .isLength({ max: 1000 }).withMessage('Mô tả tối đa 1000 ký tự')
            .trim()
    ];

}

module.exports = LocalGuideValidator;
