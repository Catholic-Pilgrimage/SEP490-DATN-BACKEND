/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Quản lý bài viết và comment
 */

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Tạo bài viết mới
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề bài viết (tùy chọn)
 *                 example: "Nhật ký hành hương"
 *               content:
 *                 type: string
 *                 description: Nội dung bài viết
 *                 example: "Hành trình hôm nay thật tuyệt vời!"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Tối đa 10 ảnh, mỗi ảnh tối đa 10MB
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: 1 audio tối đa 100MB (mp3, wav, m4a, mp4, aac, ogg)
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: 1 video tối đa 100MB (mp4, mov, avi, webm)
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 message:
 *                   type: string
 *                   example: "Tạo bài viết thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Lấy danh sách bài viết
 *     description: Lấy danh sách bài viết với thông tin likes_count, comments_count, và is_liked
 *     tags: [Posts]
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
 *           default: 20
 *         description: Số bài viết mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách bài viết (bao gồm comments_count)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PostListResponse'
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách bài viết thành công"
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Lấy chi tiết bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Chi tiết bài viết
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 message:
 *                   type: string
 *                   example: "Lấy bài viết thành công"
 *       404:
 *         description: Không tìm thấy bài viết
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Cập nhật bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề bài viết mới
 *               content:
 *                 type: string
 *                 description: Nội dung bài viết mới
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Ảnh mới (sẽ thay thế ảnh cũ)
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio mới (mp3, wav, m4a, mp4, aac, ogg; sẽ thay thế audio cũ)
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Video mới (sẽ thay thế video cũ)
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 message:
 *                   type: string
 *                   example: "Cập nhật bài viết thành công"
 *       403:
 *         description: Chỉ chủ bài viết mới có thể cập nhật
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Xóa bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Post deleted successfully"
 *                 message:
 *                   type: string
 *                   example: "Xóa bài viết thành công"
 *       403:
 *         description: Không có quyền xóa (chỉ chủ bài viết hoặc admin)
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Like bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Like thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Post liked successfully"
 *                     likes_count:
 *                       type: integer
 *                       example: 26
 *                 message:
 *                   type: string
 *                   example: "Like bài viết thành công"
 *       400:
 *         description: Đã like bài viết này rồi
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}/like:
 *   delete:
 *     summary: Unlike bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Unlike thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Post unliked successfully"
 *                     likes_count:
 *                       type: integer
 *                       example: 25
 *                 message:
 *                   type: string
 *                   example: "Unlike bài viết thành công"
 *       400:
 *         description: Chưa like bài viết này
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   post:
 *     summary: Thêm comment vào bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung comment
 *                 example: "Bài viết hay quá!"
 *               parent_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của comment gốc nếu đây là reply (tùy chọn)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Comment thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PostComment'
 *                 message:
 *                   type: string
 *                   example: "Tạo comment thành công"
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}/reply:
 *   post:
 *     summary: Trả lời một comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của comment gốc muốn trả lời
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung câu trả lời
 *                 example: "Mình đồng ý với bạn!"
 *     responses:
 *       201:
 *         description: Trả lời thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PostComment'
 *                 message:
 *                   type: string
 *                   example: "Reply created successfully"
 *       404:
 *         description: Không tìm thấy bài viết hoặc comment
 */

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   get:
 *     summary: Lấy danh sách comment của bài viết
 *     description: Lấy danh sách comment với thông tin role của người comment (pilgrim, local_guide, etc.)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
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
 *           default: 20
 *         description: Số comment mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách comment (bao gồm author.role)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CommentListResponse'
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách comment thành công"
 *       404:
 *         description: Không tìm thấy bài viết
 */

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}:
 *   put:
 *     summary: Cập nhật comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của comment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung comment mới
 *                 example: "Bài viết rất hay!"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PostComment'
 *                 message:
 *                   type: string
 *                   example: "Cập nhật comment thành công"
 *       403:
 *         description: Chỉ chủ comment mới có thể cập nhật
 *       404:
 *         description: Không tìm thấy comment
 */

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}:
 *   delete:
 *     summary: Xóa comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của comment
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Comment deleted successfully"
 *                 message:
 *                   type: string
 *                   example: "Xóa comment thành công"
 *       403:
 *         description: Không có quyền xóa (chỉ chủ comment, chủ bài viết, hoặc admin)
 *       404:
 *         description: Không tìm thấy comment
 */

module.exports = {};
