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
 *               privacy:
 *                 type: string
 *                 enum: [private, public]
 *                 default: private
 *                 description: Chế độ riêng tư
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
 * /api/journals/public:
 *   get:
 *     summary: Lấy danh sách nhật ký công khai
 *     tags: [Journals - Pilgrim]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
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
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               privacy:
 *                 type: string
 *                 enum: [private, public]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhật ký
 *
 *   delete:
 *     summary: Xóa nhật ký
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
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhật ký
 */

module.exports = {};
