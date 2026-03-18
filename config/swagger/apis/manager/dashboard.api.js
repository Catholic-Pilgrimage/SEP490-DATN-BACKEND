/**
 * @swagger
 * tags:
 *   name: Manager - Dashboard
 *   description: Manager dashboard và analytics cho site được quản lý
 */

/**
 * @swagger
 * /api/manager/dashboard/overview:
 *   get:
 *     summary: Lấy tổng quan dashboard cho site của Manager
 *     description: Lấy thống kê tổng quan về site mà Manager đang quản lý
 *     tags: [Manager - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, custom]
 *         description: |
 *           Lọc theo khoảng thời gian:
 *           - today: Hôm nay
 *           - week: Tuần này
 *           - month: Tháng này
 *           - custom: Tùy chỉnh (cần from_date và to_date)
 *           - Không truyền: Tất cả thời gian
 *         example: "month"
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (chỉ dùng khi period=custom)
 *         example: "2026-03-01"
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (chỉ dùng khi period=custom)
 *         example: "2026-03-14"
 *     responses:
 *       200:
 *         description: Lấy thống kê thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ManagerDashboardOverviewResponse'
 *       403:
 *         description: Manager chưa được gán vào site nào
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/manager/dashboard/analytics/checkins:
 *   get:
 *     summary: Lấy dữ liệu check-in theo ngày tại site
 *     description: Lấy số lượng check-in theo ngày tại site của Manager
 *     tags: [Manager - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, custom]
 *         description: |
 *           Lọc theo khoảng thời gian (ưu tiên hơn days):
 *           - today: Hôm nay
 *           - week: Tuần này
 *           - month: Tháng này
 *           - custom: Tùy chỉnh (cần from_date và to_date)
 *         example: "week"
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (chỉ dùng khi period=custom)
 *         example: "2026-03-01"
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (chỉ dùng khi period=custom)
 *         example: "2026-03-14"
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Số ngày lấy dữ liệu (fallback nếu không có period, mặc định 30)
 *     responses:
 *       200:
 *         description: Lấy dữ liệu thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckinAnalyticsResponse'
 *       403:
 *         description: Manager chưa được gán vào site nào
 *       401:
 *         description: Chưa đăng nhập
 */

module.exports = {};
