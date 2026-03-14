/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarSyncResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy dữ liệu đồng bộ lịch thành công"
 *         data:
 *           $ref: '#/components/schemas/CalendarSyncData'
 *
 *     CalendarSyncData:
 *       type: object
 *       properties:
 *         planner:
 *           $ref: '#/components/schemas/CalendarPlannerInfo'
 *         events:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CalendarEvent'
 *         total_events:
 *           type: integer
 *           example: 6
 *         sync_instructions:
 *           $ref: '#/components/schemas/CalendarSyncInstructions'
 *
 *     CalendarPlannerInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Hành hương miền Trung"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2024-12-20"
 *         end_date:
 *           type: string
 *           format: date
 *           example: "2024-12-22"
 *         number_of_people:
 *           type: integer
 *           example: 4
 *         transportation:
 *           type: string
 *           example: "car"
 *         owner:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *               example: "Nguyễn Văn A"
 *             email:
 *               type: string
 *               example: "user@example.com"
 *
 *     CalendarEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: "Planner item ID"
 *         title:
 *           type: string
 *           example: "Hành hương miền Trung - Nhà thờ Đức Bà"
 *           description: "Event title (format: planner_name - site_name)"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-12-20T09:00:00.000Z"
 *           description: "Event start time (ISO 8601 UTC)"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-12-20T11:00:00.000Z"
 *           description: "Event end time (startDate + rest_duration)"
 *         location:
 *           type: string
 *           example: "01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM"
 *           description: "Site address or location"
 *         notes:
 *           type: string
 *           example: "📍 Nhà thờ Đức Bà\n🗺️ TP.HCM\n📅 Ngày 1 - Điểm 1\n⏱️ Thời gian nghỉ: 2h"
 *           description: "Formatted notes with emoji and details"
 *         alarms:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CalendarAlarm'
 *           description: "List of alarms/reminders"
 *         timeZone:
 *           type: string
 *           example: "Asia/Ho_Chi_Minh"
 *           description: "Event timezone"
 *         metadata:
 *           $ref: '#/components/schemas/CalendarEventMetadata'
 *
 *     CalendarAlarm:
 *       type: object
 *       properties:
 *         relativeOffset:
 *           type: integer
 *           example: -30
 *           description: "Minutes before event (negative value)"
 *
 *     CalendarEventMetadata:
 *       type: object
 *       description: "Additional metadata for mobile app"
 *       properties:
 *         planner_id:
 *           type: string
 *           format: uuid
 *         planner_item_id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         site_code:
 *           type: string
 *           example: "CHNAM001"
 *         day_number:
 *           type: integer
 *           example: 1
 *         order_index:
 *           type: integer
 *           example: 1
 *         coordinates:
 *           type: object
 *           nullable: true
 *           properties:
 *             latitude:
 *               type: number
 *               example: 10.7797
 *             longitude:
 *               type: number
 *               example: 106.6990
 *
 *     CalendarSyncInstructions:
 *       type: object
 *       properties:
 *         timezone:
 *           type: string
 *           example: "Asia/Ho_Chi_Minh"
 *         alarm_offsets:
 *           type: array
 *           items:
 *             type: integer
 *           example: [-30, -60]
 *           description: "Default alarm offsets in minutes"
 *         recommended_calendar_name:
 *           type: string
 *           example: "Hành Hương - Hành hương miền Trung"
 */

module.exports = {};
