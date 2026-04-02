/**
 * @swagger
 * tags:
 *   name: Pilgrim - Friendship
 *   description: Quản lý kết bạn giữa các pilgrim
 */

/**
 * @swagger
 * /api/friendships/request:
 *   post:
 *     summary: Gửi lời mời kết bạn
 *     description: |
 *       Gửi lời mời kết bạn tới một người dùng khác.
 *       - Nếu đối phương cũng đã gửi lời mời, sẽ **tự động chấp nhận** (mutual request).
 *       - Nếu đã bị reject trước đó, cho phép gửi lại.
 *       - Không thể gửi cho chính mình hoặc người đã block.
 *     tags: [Pilgrim - Friendship]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressee_id
 *             properties:
 *               addressee_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của người muốn kết bạn
 *     responses:
 *       200:
 *         description: Gửi lời mời thành công
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [pending, accepted]
 *                     addressee:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                     message:
 *                       type: string
 *                       description: Chỉ có khi auto-accept hoặc re-send
 *       400:
 *         description: Lỗi - đã là bạn, đã gửi lời mời, hoặc không thể gửi
 *       404:
 *         description: Không tìm thấy người dùng
 */

/**
 * @swagger
 * /api/friendships/{id}/respond:
 *   post:
 *     summary: Phản hồi lời mời kết bạn (Chấp nhận/Từ chối)
 *     description: Chỉ người nhận (addressee) mới có quyền phản hồi.
 *     tags: [Pilgrim - Friendship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lời mời kết bạn (friendship ID)
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
 *                 description: Chấp nhận hoặc từ chối
 *     responses:
 *       200:
 *         description: Phản hồi thành công
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
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [accepted, rejected]
 *                     requester:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                     addressee:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *       400:
 *         description: Hành động không hợp lệ hoặc đã xử lý
 *       403:
 *         description: Không có quyền - chỉ người nhận mới phản hồi được
 *       404:
 *         description: Không tìm thấy lời mời
 */

/**
 * @swagger
 * /api/friendships:
 *   get:
 *     summary: Lấy danh sách bạn bè / lời mời kết bạn
 *     description: |
 *       Trả về danh sách friendships, có phân trang.
 *       - `status=accepted` (mặc định): danh sách bạn bè đã chấp nhận.
 *       - `status=pending`: danh sách lời mời kết bạn mà người dùng hiện tại nhận được (addressee).
 *     tags: [Pilgrim - Friendship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [accepted, pending]
 *           default: accepted
 *         description: Lọc theo trạng thái friendship
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách friendships
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           friendship_id:
 *                             type: string
 *                             format: uuid
 *                           status:
 *                             type: string
 *                             enum: [accepted, pending]
 *                           user:
 *                             type: object
 *                             description: Thông tin người kia (bạn bè hoặc người gửi lời mời)
 *                             properties:
 *                               id:
 *                                 type: string
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               avatar_url:
 *                                 type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 */

/**
 * @swagger
 * /api/friendships/{friendId}:
 *   delete:
 *     summary: Hủy kết bạn
 *     description: Hủy quan hệ bạn bè. Cả hai bên đều có thể hủy.
 *     tags: [Pilgrim - Friendship]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của người muốn hủy kết bạn (user ID, không phải friendship ID)
 *     responses:
 *       200:
 *         description: Hủy kết bạn thành công
 *       404:
 *         description: Không tìm thấy quan hệ bạn bè
 */
