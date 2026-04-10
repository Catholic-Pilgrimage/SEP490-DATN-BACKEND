
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

/**
 * @swagger
 * /api/sos/manager/{id}/assign-guide:
 *   patch:
 *     summary: Chỉ định hướng dẫn viên xử lý SOS
 *     description: Quản lý chỉ định một Local Guide thuộc cùng khu vực để tiếp nhận và xử lý yêu cầu SOS đang chờ (pending). Sau khi chỉ định, SOS chuyển sang trạng thái accepted và cả Guide lẫn Pilgrim đều nhận thông báo.
 *     tags: [Manager - SOS]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của yêu cầu SOS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guide_id
 *             properties:
 *               guide_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của Local Guide được chỉ định
 *     responses:
 *       200:
 *         description: Chỉ định hướng dẫn viên thành công
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
 *                 data:
 *                   $ref: '#/components/schemas/SOSRequest'
 *       400:
 *         description: SOS không ở trạng thái pending hoặc Guide không hợp lệ
 *       403:
 *         description: Không có quyền (không phải manager)
 *       404:
 *         description: Không tìm thấy SOS hoặc Guide
 *       409:
 *         description: SOS đã có người nhận
 */

module.exports = {};
