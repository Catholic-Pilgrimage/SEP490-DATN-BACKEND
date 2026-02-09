/**
 * @swagger
 * tags:
 *   - name: Pilgrim - SOS
 *     description: API yêu cầu SOS khẩn cấp
 */

/**
 * @swagger
 * /api/sos:
 *   post:
 *     summary: Tạo yêu cầu SOS
 *     description: Người hành hương gửi yêu cầu SOS khẩn cấp. Hướng dẫn viên đang trực sẽ nhận thông báo ngay lập tức.
 *     tags: [Pilgrim - SOS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SOSCreateRequest'
 *     responses:
 *       201:
 *         description: Tạo yêu cầu SOS thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tạo yêu cầu SOS thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SOSRequest'
 *       400:
 *         description: Yêu cầu không hợp lệ (đã có SOS đang chờ xử lý, v.v.)
 */

/**
 * @swagger
 * /api/sos:
 *   get:
 *     summary: Lấy danh sách SOS của tôi
 *     description: Lấy danh sách các yêu cầu SOS do người dùng hiện tại tạo
 *     tags: [Pilgrim - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *         description: Filter by status
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
 *           default: 10
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: List of SOS requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sosRequests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SOSRequest'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/sos/{id}:
 *   get:
 *     summary: Xem chi tiết SOS
 *     description: Xem chi tiết một yêu cầu SOS cụ thể
 *     tags: [Pilgrim - SOS]
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
 *         description: Chi tiết yêu cầu SOS
 *       404:
 *         description: Không tìm thấy yêu cầu SOS
 *   delete:
 *     summary: Hủy yêu cầu SOS
 *     description: Hủy yêu cầu SOS đang chờ xử lý
 *     tags: [Pilgrim - SOS]
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
 *         description: Hủy yêu cầu SOS thành công
 *       400:
 *         description: Không thể hủy (không ở trạng thái chờ xử lý)
 */

module.exports = {};
