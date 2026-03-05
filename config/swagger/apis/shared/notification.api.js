/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Quản lý thông báo (dùng chung cho tất cả roles)
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
 *                     updated:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     summary: Xóa tất cả thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa tất cả thông báo thành công
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
 *                   example: "Đã xóa tất cả thông báo thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: integer
 *                       example: 15
 *                       description: Số lượng thông báo đã xóa
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/read:
 *   delete:
 *     summary: Xóa tất cả thông báo đã đọc
 *     description: Xóa tất cả thông báo có trạng thái is_read = true
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa thông báo đã đọc thành công
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
 *                   example: "Xóa thông báo thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: integer
 *                       example: 8
 *                       description: Số lượng thông báo đã đọc đã xóa
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa một thông báo
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

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: 🧪 TEST - Gửi 1 notification test
 *     description: Endpoint để test notification (chỉ dùng cho development). Có thể chỉ định user_id để test cho user khác.
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
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum:
 *                   - local_guide_created
 *                   - local_guide_disabled
 *                   - local_guide_removed
 *                   - shift_assigned
 *                   - shift_rejected
 *                   - site_update_submitted
 *                   - site_approved
 *                   - site_rejected
 *                   - site_hidden
 *                   - media_approved
 *                   - media_rejected
 *                   - event_approved
 *                   - event_rejected
 *                   - schedule_approved
 *                   - schedule_rejected
 *                   - nearby_place_approved
 *                   - nearby_place_rejected
 *                   - sos_created
 *                   - sos_assigned
 *                   - sos_resolved
 *                   - planner_invite
 *                   - planner_joined
 *                   - favorite_site_update
 *                   - verification_submitted
 *                   - site_registration_submitted
 *                   - media_submitted
 *                   - event_submitted
 *                   - schedule_submitted
 *                   - nearby_place_submitted
 *                   - shift_submitted
 *                 example: media_submitted
 *                 description: Loại notification cần test
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 example: "a4ad2993-ea29-4533-b11f-b4230c615ff3"
 *                 description: User ID nhận notification (optional, mặc định là user đang đăng nhập)
 *               data:
 *                 type: object
 *                 description: Custom data (optional)
 *                 properties:
 *                   siteName:
 *                     type: string
 *                     example: "Nhà thờ Đức Bà"
 *                   guideName:
 *                     type: string
 *                     example: "Nguyễn Văn A"
 *                   eventName:
 *                     type: string
 *                     example: "Lễ Giáng Sinh"
 *                   placeName:
 *                     type: string
 *                     example: "Nhà hàng ABC"
 *                   weekStart:
 *                     type: string
 *                     example: "05/02/2026"
 *                   reason:
 *                     type: string
 *                     example: "Nội dung không phù hợp"
 *     responses:
 *       200:
 *         description: Gửi test notification thành công
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
 *                   example: "Test notification sent to user a4ad2993-ea29-4533-b11f-b4230c615ff3"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     type:
 *                       type: string
 *                       example: "media_submitted"
 *                     title:
 *                       type: string
 *                       example: "Media mới cần duyệt"
 *                     message:
 *                       type: string
 *                       example: "Nguyễn Văn A đã tải lên media mới"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Type không hợp lệ hoặc user_id không đúng định dạng
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/notifications/test/all:
 *   post:
 *     summary: 🧪 TEST - Gửi TẤT CẢ notification types
 *     description: Gửi tất cả 30 loại notification cùng lúc để test UI (chỉ dùng cho development). Có thể chỉ định user_id để test cho user khác.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 example: "a4ad2993-ea29-4533-b11f-b4230c615ff3"
 *                 description: User ID nhận notification (optional, mặc định là user đang đăng nhập)
 *     responses:
 *       200:
 *         description: Gửi tất cả test notifications thành công
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
 *                   example: "Sent 30 test notifications to user a4ad2993-ea29-4533-b11f-b4230c615ff3"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 30
 *                       description: Tổng số notifications đã gửi
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: "media_submitted"
 *                           success:
 *                             type: boolean
 *                             example: true
 *                           id:
 *                             type: string
 *                             format: uuid
 *       400:
 *         description: user_id không đúng định dạng
 *       401:
 *         description: Chưa xác thực
 */

module.exports = {};

