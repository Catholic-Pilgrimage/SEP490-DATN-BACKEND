
/**
 * @swagger
 * /api/sos/manager/list:
 *   get:
 *     summary: Xem tất cả SOS tại địa điểm
 *     description: Quản lý xem tất cả yêu cầu SOS tại địa điểm của họ
 *     tags: [Manager - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: List of SOS requests
 */

/**
 * @swagger
 * /api/sos/manager/stats:
 *   get:
 *     summary: Xem thống kê SOS
 *     description: Quản lý xem thống kê SOS cho địa điểm của họ
 *     tags: [Manager - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thống kê SOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SOSStats'
 */

module.exports = {};
