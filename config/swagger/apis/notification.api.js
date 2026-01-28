/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Quản lý thông báo
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Chỉ lấy thông báo chưa đọc
 *     responses:
 *       200:
 *         description: Lấy danh sách thông báo thành công
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
 *                   example: "Lấy danh sách thông báo thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           type:
 *                             type: string
 *                             example: "planner_invite"
 *                           title:
 *                             type: string
 *                             example: "Lời mời tham gia kế hoạch"
 *                           message:
 *                             type: string
 *                             example: "Admin đã mời bạn tham gia kế hoạch Test"
 *                           data:
 *                             type: object
 *                           is_read:
 *                             type: boolean
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         total_pages:
 *                           type: integer
 *                     unread_count:
 *                       type: integer
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/token:
 *   post:
 *     summary: Đăng ký Expo push token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expo_token
 *               - platform
 *             properties:
 *               expo_token:
 *                 type: string
 *                 example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *                 description: Expo push token từ thiết bị
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *                 example: "android"
 *               device_id:
 *                 type: string
 *                 example: "device-123"
 *                 description: Mã định danh thiết bị
 *     responses:
 *       200:
 *         description: Đăng ký token thành công
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
 *                   example: "Đăng ký token push thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     expo_token:
 *                       type: string
 *                     platform:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "active"
 *       400:
 *         description: Định dạng token không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/token:
 *   delete:
 *     summary: Thu hồi push token
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expo_token
 *             properties:
 *               expo_token:
 *                 type: string
 *                 example: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *     responses:
 *       200:
 *         description: Thu hồi token thành công
 *       400:
 *         description: Token là bắt buộc
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID thông báo
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 *       404:
 *         description: Không tìm thấy thông báo
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu tất cả đã đọc thành công
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
 *                   example: "Đánh dấu tất cả đã đọc thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     updated_count:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID thông báo
 *     responses:
 *       200:
 *         description: Xóa thông báo thành công
 *       404:
 *         description: Không tìm thấy thông báo
 *       401:
 *         description: Chưa xác thực
 */

module.exports = {};
