/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePlannerRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Hành hương miền Bắc"
 *           description: "Tên kế hoạch (tối đa 255 ký tự)"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2026-02-01"
 *           description: "Ngày bắt đầu (YYYY-MM-DD)"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2026-02-05"
 *           description: "Ngày kết thúc (YYYY-MM-DD)"
 *         number_of_people:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 4
 *           description: "Số người (tối thiểu 1)"
 *         transportation:
 *           type: string
 *           enum: [motorbike, car, bus]
 *           example: "car"
 *           description: "Phương tiện di chuyển"
 *
 *     UpdatePlannerRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Hành hương miền Bắc - Updated"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2026-02-01"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2026-02-10"
 *         number_of_people:
 *           type: integer
 *           minimum: 1
 *           example: 6
 *         transportation:
 *           type: string
 *           enum: [motorbike, car, bus]
 *           example: "bus"
 *         status:
 *           type: string
 *           enum: [planning, ongoing, completed]
 *           example: "ongoing"
 *
 *     AddPlannerItemRequest:
 *       type: object
 *       required:
 *         - site_id
 *         - day_number
 *       properties:
 *         site_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *           description: "ID của địa điểm"
 *         day_number:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *           description: "Ngày thứ mấy trong kế hoạch"
 *         note:
 *           type: string
 *           example: "Tham quan vào buổi sáng"
 *           description: "Ghi chú cho điểm này"
 *         nearby_amenity_ids:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["amenity-uuid-1", "amenity-uuid-2"]
 *           description: "Danh sách ID các địa điểm tiện ích gần đó (nhà hàng, khách sạn, y tế)"
 *         estimated_time:
 *           type: string
 *           pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *           example: "09:00"
 *           description: "Giờ dự kiến đến địa điểm (HH:MM). Nếu không cung cấp, hệ thống sẽ tự động tính dựa trên điểm trước đó"
 *         rest_duration:
 *           type: string
 *           pattern: '^\d+\s+(hour|hours|minute|minutes|min|mins)$'
 *           example: "2 hours"
 *           description: "Thời gian nghỉ ngơi/tham quan tại địa điểm (ví dụ: '1 hour', '30 minutes', '2 hours')"
 *
 *     ReorderItemsRequest:
 *       type: object
 *       required:
 *         - day_number
 *         - item_ids
 *       properties:
 *         day_number:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *           description: "Ngày cần sắp xếp lại"
 *         item_ids:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           example: ["item-uuid-3", "item-uuid-1", "item-uuid-2"]
 *           description: "Danh sách ID theo thứ tự mới"
 *
 *     PlannerItem:
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
 *         day_number:
 *           type: integer
 *         order_index:
 *           type: integer
 *         note:
 *           type: string
 *         nearby_amenity_ids:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: "Danh sách ID các địa điểm tiện ích gần đó"
 *         estimated_time:
 *           type: string
 *           example: "09:00"
 *           description: "Giờ dự kiến đến địa điểm (HH:MM)"
 *         rest_duration:
 *           type: string
 *           example: "2 hours"
 *           description: "Thời gian nghỉ ngơi/tham quan tại địa điểm"
 *         estimated_departure_time:
 *           type: string
 *           example: "11:00"
 *           description: "Giờ dự kiến rời khỏi địa điểm (tự động tính = estimated_time + rest_duration)"
 *         site:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             code:
 *               type: string
 *             province:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             cover_image:
 *               type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     Planner:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         number_of_people:
 *           type: integer
 *         transportation:
 *           type: string

 *         status:
 *           type: string
 *         share_token:
 *           type: string
 *         qr_code_url:
 *           type: string
 *           description: QR code image as base64 data URL
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *             avatar_url:
 *               type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     PlannerWithItems:
 *       allOf:
 *         - $ref: '#/components/schemas/Planner'
 *         - type: object
 *           properties:
 *             items_by_day:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PlannerItem'
 *               example:
 *                 "1": [{"id": "item-1", "site": {"name": "Nhà thờ Đức Bà"}}]
 *                 "2": [{"id": "item-2", "site": {"name": "Nhà thờ Phát Diệm"}}]
 *
 *     PlannerResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tạo kế hoạch thành công"
 *         data:
 *           $ref: '#/components/schemas/Planner'
 *
 *     PlannerListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách kế hoạch thành công"
 *         data:
 *           type: object
 *           properties:
 *             planners:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Planner'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *
 *     AddItemResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Thêm điểm thành công"
 *         data:
 *           $ref: '#/components/schemas/PlannerItem'
 */

module.exports = {};
