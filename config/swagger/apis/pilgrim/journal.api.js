/**
 * @swagger
 * tags:
 *   name: Journals - Pilgrim
 *   description: Nhật ký tâm linh
 */

/**
 * @swagger
 * /api/journals:
 *   post:
 *     summary: Tạo nhật ký tâm linh mới (yêu cầu check-in trước)
 *     tags: [Journals - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - planner_item_id
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *                 description: Tiêu đề nhật ký
 *                 example: "Chuyến hành hương đến Nhà thờ Đức Bà"
 *               content:
 *                 type: string
 *                 description: Nội dung nhật ký
 *                 example: "Hôm nay tôi đã có một chuyến hành hương ý nghĩa..."
 *               planner_item_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của planner item đã check-in (bắt buộc)
 *                 example: "abc-123-def-456"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Tối đa 10 ảnh (jpg, png, jpeg, webp), mỗi ảnh max 10MB
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: File audio (mp3, wav, m4a, ogg, aac), max 100MB
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: File video, max 100MB
 *     responses:
 *       201:
 *         description: Tạo nhật ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc chưa check-in
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/journals/me:
 *   get:
 *     summary: Lấy danh sách nhật ký của tôi
 *     tags: [Journals - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *           enum: ['true', 'false', 'all']
 *           default: 'true'
 *         description: Lọc nhật ký theo trạng thái hoạt động. `true` = đang hoạt động, `false` = đã ẩn, `all` = lấy tất cả
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
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 */


/**
 * @swagger
 * /api/journals/{id}:
 *   get:
 *     summary: Lấy chi tiết nhật ký
 *     tags: [Journals - Pilgrim]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       404:
 *         description: Không tìm thấy nhật ký
 *
 *   patch:
 *     summary: Cập nhật nhật ký
 *     tags: [Journals - Pilgrim]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề nhật ký. Bắt buộc.
 *               content:
 *                 type: string
 *                 description: Nội dung nhật ký. Bắt buộc.
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Ảnh mới để thay thế toàn bộ danh sách ảnh hiện tại. Không gửi `images` và không gửi `image_url`/`image_urls` thì backend sẽ xóa toàn bộ ảnh.
 *               image_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: Danh sách URL ảnh muốn giữ lại. Nếu không gửi và cũng không upload `images` thì backend sẽ xóa toàn bộ ảnh.
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio mới để thay thế audio hiện tại. Nếu không gửi `audio` và không gửi `audio_url` thì backend sẽ xóa audio hiện tại.
 *               audio_url:
 *                 type: string
 *                 format: uri
 *                 description: URL audio muốn giữ lại. Để trống hoặc không gửi thì backend sẽ xóa audio nếu không có file `audio` mới.
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video mới để thay thế video hiện tại. Nếu không gửi `video` và không gửi `video_url` thì backend sẽ xóa video hiện tại.
 *               video_url:
 *                 type: string
 *                 format: uri
 *                 description: URL video muốn giữ lại. Để trống hoặc không gửi thì backend sẽ xóa video nếu không có file `video` mới.
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhật ký
 *
 *   delete:
 *     summary: Ẩn nhật ký tâm linh
 *     tags: [Journals - Pilgrim]
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
 *         description: Ẩn thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhật ký
 */

/**
 * @swagger
 * /api/journals/{id}/restore:
 *   patch:
 *     summary: Khôi phục nhật ký tâm linh đã ẩn
 *     tags: [Journals - Pilgrim]
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
 *         description: Khôi phục thành công
 *       400:
 *         description: Nhật ký đang hoạt động hoặc đã có một nhật ký đang hoạt động cho cùng lần ghé thăm/hành trình
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhật ký
 */

/**
 * @swagger
 * /api/journals/{id}/share:
 *   post:
 *     summary: Chia sẻ nhật ký lên cộng đồng (Posts)
 *     tags: [Journals - Pilgrim]
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
 *       201:
 *         description: Chia sẻ thành công
 *       400:
 *         description: Nhật ký đã được chia sẻ trước đó
 *       403:
 *         description: Không có quyền chia sẻ nhật ký của người khác
 *       404:
 *         description: Không tìm thấy nhật ký
 */

module.exports = {};
