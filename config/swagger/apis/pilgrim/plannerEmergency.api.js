/**
 * @swagger
 * /api/planners/{id}/emergency-stop:
 *   post:
 *     summary: "[Trưởng đoàn] Dừng khẩn cấp hành trình đang diễn ra"
 *     description: |
 *       Chỉ chủ kế hoạch được phép bấm nút dừng khẩn cấp.
 *       Endpoint này chỉ hợp lệ khi planner đang ở trạng thái **ongoing**.
 *
 *       Khi thành công:
 *       - Planner chuyển trạng thái sang **cancelled**
 *       - Lưu `cancelled_reason`
 *       - Tất cả planner item đang `upcoming` được chuyển thành `skipped`
 *       - Item đã `visited` hoặc `skipped` sẽ được giữ nguyên
 *       - Gửi thông báo đến toàn bộ thành viên đã join
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmergencyStopPlannerRequest'
 *     responses:
 *       200:
 *         description: Dừng khẩn cấp thành công
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
 *                   $ref: '#/components/schemas/Planner'
 *       400:
 *         description: Planner không ở trạng thái ongoing hoặc lý do không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/continue:
 *   post:
 *     summary: "Tiếp nối hành trình sau khi dừng khẩn cấp"
 *     description: |
 *       Thành viên của hành trình bị dừng khẩn cấp (cancelled) có thể bấm để tiếp tục phần lịch trình chưa đi.
 *       
 *       - Người đầu tiên bấm sẽ trở thành Chủ đoàn của hành trình mới.
 *       - Hành trình mới chỉ chứa các điểm chưa đi từ hành trình cũ (đã bị skipped do emergency stop).
 *       - Các điểm này được đánh lại số ngày bắt đầu từ Ngày 1.
 *       - Tiền cọc (deposit) và phí phạt (penalty) cho hành trình mới là 0.
 *       - Những người khác bấm sau sẽ được tự động join vào hành trình mới này.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch cũ (đã bị dừng)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên mới cho hành trình tiếp nối (tùy chọn)
 *                 example: "Hành trình chữa lành phần 2"
 *     responses:
 *       200:
 *         description: Tiếp nối hành trình thành công
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     continuation_of_id:
 *                       type: string
 *       400:
 *         description: Planner không bị cancelled hoặc không còn điểm nào để đi tiếp
 *       403:
 *         description: Không phải thành viên của hành trình cũ
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
