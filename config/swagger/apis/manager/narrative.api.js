/**
 * @swagger
 * /api/manager/content/media/{id}/narrative-status:
 *   patch:
 *     summary: Duyệt hoặc từ chối thuyết minh Model 3D (Manager)
 *     description: |
 *       Manager phê duyệt hoặc từ chối đoạn thuyết minh âm thanh do Local Guide gửi.
 *       - Chỉ áp dụng cho media có `narrative_status = 'pending'`
 *       - Nếu từ chối phải kèm `rejection_reason`
 *       - Thông báo sẽ được gửi tự động cho Local Guide (push + in-app)
 *       - Khi approve: xóa rejection_reason cũ (nếu có)
 *       - Khi reject: Local Guide có thể sửa lại hoặc xóa thuyết minh
 *     tags: [Manager - Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của SiteMedia (phải là type model_3d)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 example: "approved"
 *               rejection_reason:
 *                 type: string
 *                 example: "Nội dung chưa chính xác, vui lòng sửa lại"
 *                 description: Bắt buộc khi status = rejected
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thuyết minh thành công
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
 *                   example: "Đã phê duyệt thuyết minh thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     narrative_status:
 *                       type: string
 *                       example: "approved"
 *                     audio_url:
 *                       type: string
 *                     narration_text:
 *                       type: string
 *                     narrative_rejection_reason:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: |
 *           - Status không hợp lệ (phải là approved hoặc rejected)
 *           - Thiếu lý do từ chối khi reject
 *           - Thuyết minh không ở trạng thái pending
 *           - Media không phải model_3d
 *           - Chưa có thuyết minh (audio_url = null)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền (khác site hoặc không phải Manager)
 *       404:
 *         description: Media không tồn tại
 */
