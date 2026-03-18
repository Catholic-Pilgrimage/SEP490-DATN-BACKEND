/**
 * @swagger
 * tags:
 *   name: Check-ins - Pilgrim
 *   description: Check-in tại các điểm trong kế hoạch
 */

/**
 * @swagger
 * /api/planner-items/{id}/checkin:
 *   post:
 *     summary: Check-in tại một điểm trong kế hoạch
 *     description: |
 *       Cho phép người dùng check-in tại một điểm trong kế hoạch của họ hoặc nhóm.
 *
 *       **Quy tắc:**
 *       - User phải là owner HOẶC member của planner
 *       - Hệ thống tính khoảng cách đi bộ thực tế bằng VietMap API
 *       - Check-in hợp lệ nếu khoảng cách đi bộ ≤ 500m
 *       - Mỗi user chỉ được check-in 1 lần mỗi điểm
 *       - Check-in phải theo thứ tự chặng (order_index)
 *
 *       **Status của user_checkins:**
 *       - `checked_in` - đã check-in
 *       - `skipped` - chủ động bỏ qua
 *       - `missed` - quá thời gian không check-in
 *       - `absent` - không tham gia
 *     tags: [Check-ins - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 10.371395
 *               longitude:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 107.062612
 *               note:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Check-in thành công
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
 *                   example: "Check-in thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     distance:
 *                       type: integer
 *                       description: "Khoảng cách đến địa điểm (mét)"
 *                     is_valid:
 *                       type: boolean
 *                     planner_status:
 *                       type: string
 *       400:
 *         description: Lỗi xác thực hoặc đã check-in rồi
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải thành viên nhóm
 *       404:
 *         description: Không tìm thấy planner item
 */

/**
 * @swagger
 * /api/planner-items/{id}/skip:
 *   post:
 *     summary: Bỏ qua một điểm trong kế hoạch
 *     description: |
 *       User chủ động đánh dấu không đi điểm này.
 *       - Cập nhật user_checkins.status = 'skipped'
 *       - Tính toán lại planner_items.status
 *     tags: [Check-ins - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner item
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Không có thời gian"
 *     responses:
 *       200:
 *         description: Đã đánh dấu bỏ qua
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
 *                   example: "Đã đánh dấu bỏ qua địa điểm này"
 */

module.exports = {};
