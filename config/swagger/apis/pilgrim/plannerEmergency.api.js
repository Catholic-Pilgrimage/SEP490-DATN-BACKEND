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
