/**
 * @swagger
 * tags:
 *   name: Admin - Dashboard
 *   description: Admin dashboard và analytics
 */

/**
 * @swagger
 * /api/admin/dashboard/overview:
 *   get:
 *     summary: Lấy tổng quan dashboard
 *     description: Lấy tất cả thống kê tổng quan cho admin dashboard với filter theo thời gian
 *     tags: [Admin - Dashboard]
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
 *           - week: Tuần này (Chủ nhật - Thứ 7)
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
 *               $ref: '#/components/schemas/DashboardOverviewResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/dashboard/analytics/users-growth:
 *   get:
 *     summary: Lấy dữ liệu tăng trưởng người dùng
 *     description: Lấy số lượng người dùng đăng ký mới theo ngày với filter theo thời gian
 *     tags: [Admin - Dashboard]
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
 *               $ref: '#/components/schemas/UserGrowthResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/dashboard/analytics/checkins:
 *   get:
 *     summary: Lấy dữ liệu check-in theo ngày
 *     description: Lấy số lượng check-in theo ngày với filter theo thời gian
 *     tags: [Admin - Dashboard]
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
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/dashboard/analytics/popular-sites:
 *   get:
 *     summary: Lấy danh sách địa điểm phổ biến
 *     description: Lấy danh sách địa điểm được thăm nhiều nhất với filter theo thời gian
 *     tags: [Admin - Dashboard]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng địa điểm (mặc định 10)
 *     responses:
 *       200:
 *         description: Lấy dữ liệu thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PopularSitesResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

module.exports = {};


/**
 * @swagger
 * /api/admin/dashboard/analytics/sos-by-site:
 *   get:
 *     summary: Lấy thống kê SOS theo địa điểm
 *     description: Lấy danh sách địa điểm có nhiều yêu cầu SOS nhất với filter theo thời gian
 *     tags: [Admin - Dashboard]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng địa điểm (mặc định 10)
 *     responses:
 *       200:
 *         description: Lấy dữ liệu thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SOSBySiteResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

module.exports = {};
