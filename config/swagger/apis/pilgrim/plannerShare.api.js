/**
 * @swagger
 * tags:
 *   name: Pilgrim - Planner Share
 *   description: Chia sẻ kế hoạch hành hương
 */

/**
 * @swagger
 * /api/planners/invite/{token}:
 *   get:
 *     summary: Xem trước kế hoạch qua link mời (không cần đăng nhập)
 *     description: Trả về thông tin kế hoạch và trạng thái lời mời để FE hiển thị preview trước khi người dùng đăng nhập/đăng ký.
 *     tags: [Pilgrim - Planner Share]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token lời mời
 *     responses:
 *       200:
 *         description: Trả về thông tin lời mời và kế hoạch thành công
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
 *                     invite:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         status:
 *                           type: string
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                     planner:
 *                       $ref: '#/components/schemas/PlannerWithItems'
 *       400:
 *         description: Lời mời đã hết hạn
 *       404:
 *         description: Không tìm thấy lời mời
 */



/**
 * @swagger
 * /api/planners/{id}/invite:
 *   post:
 *     summary: Mời người dùng vào kế hoạch
 *     description: Gửi email mời một người dùng khác tham gia vào kế hoạch. Chỉ chủ sở hữu mới có quyền mời.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email của người được mời
 *     responses:
 *       200:
 *         description: Đã gửi lời mời thành công
 *       400:
 *         description: Lỗi xác thực, kế hoạch đã đầy, hoặc người dùng đã là thành viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc người dùng
 */

/**
 * @swagger
 * /api/planners/invite/{token}:
 *   post:
 *     summary: Phản hồi lời mời (Chấp nhận/Từ chối)
 *     description: Người được mời phản hồi (accept hoặc reject) lời mời tham gia kế hoạch bằng token.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token của lời mời
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Hành động (chấp nhận hoặc từ chối)
 *     responses:
 *       200:
 *         description: Phản hồi lời mời thành công
 *       400:
 *         description: Hành động không hợp lệ, lời mời đã xử lý hoặc hết hạn
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (Email không khớp)
 *       404:
 *         description: Không tìm thấy lời mời
 */

/**
 * @swagger
 * /api/planners/{id}/invites:
 *   get:
 *     summary: Lấy danh sách lời mời của kế hoạch
 *     description: Lấy danh sách các lời mời chưa xử lý hoặc đã gửi của kế hoạch. Chỉ chủ sở hữu mới có quyền xem.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Trả về danh sách lời mời
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/members:
 *   get:
 *     summary: Lấy danh sách thành viên của kế hoạch
 *     description: Lấy danh sách tất cả thành viên của kế hoạch (bao gồm chủ sở hữu và những người đã tham gia). Cả chủ sở hữu và thành viên đều có thể xem.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Trả về danh sách thành viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/members/{memberId}:
 *   delete:
 *     summary: Xóa thành viên khỏi kế hoạch
 *     description: Cập nhật thành viên trong kế hoạch. Chủ sở hữu có thể xóa bất kỳ thành viên nào. Thành viên chỉ có thể tự xóa chính mình rời khỏi kế hoạch.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thành viên cần xóa
 *     responses:
 *       200:
 *         description: Đã xóa thành viên thành công
 *       400:
 *         description: Không thể xóa chủ sở hữu hoặc không thể xóa khi chuyến đi đang diễn ra
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc thành viên
 */
