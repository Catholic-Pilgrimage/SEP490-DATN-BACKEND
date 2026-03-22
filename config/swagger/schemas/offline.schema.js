/**
 * @swagger
 * components:
 *   schemas:
 *     OfflineDataResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tải dữ liệu ngoại tuyến thành công"
 *         data:
 *           $ref: '#/components/schemas/OfflineDataBundle'
 *
 *     OfflineDataBundle:
 *       type: object
 *       properties:
 *         planner:
 *           $ref: '#/components/schemas/OfflinePlanner'
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflinePlannerItem'
 *         sites:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineSite'
 *         site_media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineSiteMedia'
 *         mass_schedules:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineMassSchedule'
 *         nearby_places:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineNearbyPlace'
 *         downloaded_at:
 *           type: string
 *           format: date-time
 *           example: "2024-03-15T10:30:00Z"
 *
 *     OfflinePlanner:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         total_days:
 *           type: integer
 *         number_of_people:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [planning, ongoing, completed]
 *
 *     OfflinePlannerItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         planner_id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         leg_number:
 *           type: integer
 *         order_in_day:
 *           type: integer
 *         estimated_time:
 *           type: string
 *           format: time
 *         duration_minutes:
 *           type: integer
 *         travel_time_minutes:
 *           type: integer
 *         notes:
 *           type: string
 *
 *     OfflineSite:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         name_en:
 *           type: string
 *         description:
 *           type: string
 *         description_en:
 *           type: string
 *         address:
 *           type: string
 *         province:
 *           type: string
 *         region:
 *           type: string
 *         latitude:
 *           type: string
 *         longitude:
 *           type: string
 *         site_type:
 *           type: string
 *         opening_hours:
 *           type: string
 *
 *     OfflineSiteMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         media_type:
 *           type: string
 *           enum: [image, video, model_3d, youtube]
 *         media_url:
 *           type: string
 *         thumbnail_url:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *
 *     OfflineMassSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         time:
 *           type: string
 *           format: time
 *         days_of_week:
 *           type: array
 *           items:
 *             type: integer
 *         language:
 *           type: string
 *         notes:
 *           type: string
 *
 *     OfflineNearbyPlace:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         place_type:
 *           type: string
 *         address:
 *           type: string
 *         latitude:
 *           type: string
 *         longitude:
 *           type: string
 *         phone:
 *           type: string
 *         description:
 *           type: string
 *
 *     OfflineSyncRequest:
 *       type: object
 *       required:
 *         - actions
 *       properties:
 *         actions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OfflineAction'
 *
 *     OfflineAction:
 *       type: object
 *       required:
 *         - client_action_id
 *         - type
 *         - offline_time
 *       properties:
 *         client_action_id:
 *           type: string
 *           description: "Mã ID duy nhất được tạo từ ứng dụng di động để đảm bảo tính đồng nhất (ngăn trùng lặp dữ liệu)"
 *           example: "mobile_1234567890_checkin_abc"
 *         type:
 *           type: string
 *           enum: [CHECK_IN, CREATE_JOURNAL]
 *           description: "Loại hành động ngoại tuyến"
 *         offline_time:
 *           type: string
 *           format: date-time
 *           description: "Thời gian (timestamp) lúc hành động được thực hiện ngoại tuyến"
 *           example: "2024-03-15T10:30:00Z"
 *         planner_item_id:
 *           type: string
 *           format: uuid
 *           description: "Bắt buộc đối với hành động CHECK_IN và CREATE_JOURNAL"
 *         latitude:
 *           type: number
 *           format: double
 *           description: "Dành cho hành động CHECK_IN (Vĩ độ)"
 *         longitude:
 *           type: number
 *           format: double
 *           description: "Dành cho hành động CHECK_IN (Kinh độ)"
 *         note:
 *           type: string
 *           description: "Dành cho hành động CHECK_IN (Ghi chú)"
 *         title:
 *           type: string
 *           description: "Dành cho hành động CREATE_JOURNAL (Tiêu đề nhật ký)"
 *         content:
 *           type: string
 *           description: "Dành cho hành động CREATE_JOURNAL (Nội dung nhật ký)"
 *         privacy:
 *           type: string
 *           enum: [private, public]
 *           description: "Dành cho hành động CREATE_JOURNAL (Quyền riêng tư)"
 *
 *     OfflineSyncResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Đồng bộ dữ liệu ngoại tuyến thành công"
 *         data:
 *           type: object
 *           properties:
 *             results:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OfflineActionResult'
 *
 *     OfflineActionResult:
 *       type: object
 *       properties:
 *         client_action_id:
 *           type: string
 *           example: "mobile_1234567890_checkin_abc"
 *         status:
 *           type: string
 *           enum: [synced, already_synced, failed]
 *           example: "synced"
 *         message:
 *           type: string
 *           example: "Hành động đã được xử lý (tránh trùng lặp)"
 *         checkin_id:
 *           type: string
 *           format: uuid
 *           description: "Mã ID check-in (Trả về khi CHECK_IN thành công)"
 *         is_valid:
 *           type: boolean
 *           description: "Trạng thái hợp lệ (Trả về true nếu khoảng cách check-in <= 500m)"
 *         distance_meters:
 *           type: integer
 *           description: "Khoảng cách tính bằng mét (Trả về khi CHECK_IN)"
 *         journal_id:
 *           type: string
 *           format: uuid
 *           description: "Mã ID nhật ký (Trả về khi CREATE_JOURNAL thành công)"
 *         error:
 *           type: string
 *           description: "Thông báo lỗi nếu trạng thái (status) là failed"
 */

module.exports = {};
