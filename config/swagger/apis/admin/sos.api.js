/**
 * @swagger
 * tags:
 *   - name: Admin - SOS
 *     description: API quản lý SOS toàn hệ thống
 */

/**
 * @swagger
 * /api/sos/admin/list:
 *   get:
 *     summary: Xem tất cả SOS toàn hệ thống
 *     description: Admin xem tất cả yêu cầu SOS từ tất cả các địa điểm
 *     tags: [Admin - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo địa điểm
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách SOS toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sosRequests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SOSRequest'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Không có quyền truy cập (chỉ Admin)
 */

/**
 * @swagger
 * /api/sos/admin/stats:
 *   get:
 *     summary: Xem thống kê SOS toàn hệ thống
 *     description: Admin xem thống kê SOS từ tất cả các địa điểm với breakdown theo site
 *     tags: [Admin - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo địa điểm (tùy chọn)
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *     responses:
 *       200:
 *         description: Thống kê SOS toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     pending:
 *                       type: integer
 *                       example: 5
 *                     accepted:
 *                       type: integer
 *                       example: 3
 *                     resolved:
 *                       type: integer
 *                       example: 40
 *                     cancelled:
 *                       type: integer
 *                       example: 2
 *                     by_site:
 *                       type: array
 *                       description: Thống kê theo từng địa điểm
 *                       items:
 *                         type: object
 *                         properties:
 *                           site_id:
 *                             type: string
 *                             format: uuid
 *                           site_name:
 *                             type: string
 *                             example: "Nhà thờ Đức Bà"
 *                           count:
 *                             type: integer
 *                             example: 15
 *                     average_resolution_minutes:
 *                       type: integer
 *                       nullable: true
 *                       description: Thời gian trung bình giải quyết SOS (phút)
 *                       example: 12
 *       403:
 *         description: Không có quyền truy cập (chỉ Admin)
 */

module.exports = {};
