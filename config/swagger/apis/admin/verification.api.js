/**
 * @swagger
 * tags:
 *   name: Admin - Verification
 *   description: API quản lý yêu cầu xác minh Manager (Admin)
 */

/**
 * @swagger
 * /api/admin/verification-requests:
 *   get:
 *     summary: Danh sách yêu cầu xác minh (Admin only)
 *     tags: [Admin - Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo code hoặc tên site
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/verification-requests/{id}:
 *   get:
 *     summary: Chi tiết yêu cầu xác minh (Admin only)
 *     tags: [Admin - Verification]
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
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy yêu cầu
 *   patch:
 *     summary: Cập nhật trạng thái yêu cầu - Approve/Reject (Admin only)
 *     tags: [Admin - Verification]
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
 *                 description: Trạng thái mới
 *               rejection_reason:
 *                 type: string
 *                 minLength: 10
 *                 description: Bắt buộc khi status = rejected
 *                 example: "Giấy tờ không hợp lệ, vui lòng gửi lại"
 *           examples:
 *             approve:
 *               summary: Phê duyệt
 *               value:
 *                 status: "approved"
 *             reject:
 *               summary: Từ chối
 *               value:
 *                 status: "rejected"
 *                 rejection_reason: "Giấy tờ không hợp lệ, vui lòng gửi lại"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc yêu cầu không pending
 *       404:
 *         description: Không tìm thấy yêu cầu
 */

module.exports = {};
