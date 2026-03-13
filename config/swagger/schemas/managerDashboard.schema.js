/**
 * @swagger
 * components:
 *   schemas:
 *     ManagerDashboardOverviewResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy thống kê dashboard thành công"
 *         data:
 *           type: object
 *           properties:
 *             filter_applied:
 *               $ref: '#/components/schemas/DashboardFilterApplied'
 *             site:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 code:
 *                   type: string
 *                   example: "CHNAM001"
 *                 name:
 *                   type: string
 *                   example: "Nhà thờ Đức Bà Sài Gòn"
 *                 region:
 *                   type: string
 *                   enum: [Bac, Trung, Nam]
 *                   example: "Nam"
 *                 type:
 *                   type: string
 *                   enum: [church, shrine, monastery, center, other]
 *                   example: "church"
 *                 cover_image:
 *                   type: string
 *                   example: "https://cloudinary.com/..."
 *             local_guides:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 5
 *                   description: "Tổng số Local Guides đang làm việc tại site"
 *             checkins:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 450
 *                   description: "Tổng số check-in tại site (có thể được lọc theo thời gian)"
 *                 today:
 *                   type: integer
 *                   example: 12
 *                 this_week:
 *                   type: integer
 *                   example: 85
 *                 this_month:
 *                   type: integer
 *                   example: 320
 *             sos:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 25
 *                   description: "Tổng số SOS tại site (có thể được lọc theo thời gian)"
 *                 by_status:
 *                   type: object
 *                   properties:
 *                     pending:
 *                       type: integer
 *                       example: 2
 *                     accepted:
 *                       type: integer
 *                       example: 0
 *                     resolved:
 *                       type: integer
 *                       example: 22
 *                     cancelled:
 *                       type: integer
 *                       example: 1
 *             content_stats:
 *               type: object
 *               properties:
 *                 media:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 120
 *                     pending:
 *                       type: integer
 *                       example: 3
 *                     approved:
 *                       type: integer
 *                       example: 110
 *                     rejected:
 *                       type: integer
 *                       example: 7
 *                 schedules:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     pending:
 *                       type: integer
 *                       example: 1
 *                     approved:
 *                       type: integer
 *                       example: 42
 *                     rejected:
 *                       type: integer
 *                       example: 2
 *                 events:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 30
 *                     pending:
 *                       type: integer
 *                       example: 2
 *                     approved:
 *                       type: integer
 *                       example: 26
 *                     rejected:
 *                       type: integer
 *                       example: 2
 *                 nearby_places:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 80
 *                     pending:
 *                       type: integer
 *                       example: 1
 *                     approved:
 *                       type: integer
 *                       example: 75
 *                     rejected:
 *                       type: integer
 *                       example: 4
 *                 shifts:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 200
 *                     pending:
 *                       type: integer
 *                       example: 4
 *                     approved:
 *                       type: integer
 *                       example: 190
 *                     rejected:
 *                       type: integer
 *                       example: 6
 *             pending_tasks:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 11
 *                   description: "Tổng số nhiệm vụ chờ xử lý"
 */

module.exports = {};
