/**
 * @swagger
 * tags:
 *   - name: Local Guide - SOS
 *     description: API xử lý SOS
 */

/**
 * @swagger
 * /api/sos/site/list:
 *   get:
 *     summary: Xem danh sách SOS tại địa điểm của tôi
 *     description: Hướng dẫn viên xem các yêu cầu SOS tại địa điểm được phân công
 *     tags: [Local Guide - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *       - in: query
 *         name: show_all
 *         schema:
 *           type: boolean
 *         description: Show all statuses (default shows only pending/accepted)
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
 * /api/sos/site/{id}:
 *   get:
 *     summary: Xem chi tiết SOS
 *     description: Hướng dẫn viên xem chi tiết yêu cầu SOS
 *     tags: [Local Guide - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chi tiết yêu cầu SOS với thông tin liên hệ người hành hương
 */

/**
 * @swagger
 * /api/sos/{id}/assign:
 *   patch:
 *     summary: Nhận xử lý SOS
 *     description: Hướng dẫn viên nhận/phân công bản thân xử lý yêu cầu SOS
 *     tags: [Local Guide - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Nhận SOS thành công, người hành hương đã được thông báo
 *       400:
 *         description: SOS đã được nhận hoặc không ở trạng thái chờ xử lý
 */

/**
 * @swagger
 * /api/sos/{id}/resolve:
 *   patch:
 *     summary: Giải quyết SOS
 *     description: Hướng dẫn viên đánh dấu SOS đã giải quyết sau khi hỗ trợ người hành hương
 *     tags: [Local Guide - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SOSResolveRequest'
 *     responses:
 *       200:
 *         description: Giải quyết SOS thành công, người hành hương đã được thông báo
 */

module.exports = {};
