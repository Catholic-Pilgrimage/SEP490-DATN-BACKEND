/**
 * @swagger
 * tags:
 *   - name: Local Guide - Media
 *     description: API quản lý media (hình ảnh, video) - Model 3D chỉ Manager mới upload được
 */

/**
 * @swagger
 * /api/local-guide/media:
 *   post:
 *     summary: Upload media cho site (Local Guide only)
 *     description: |
 *       Upload hình ảnh hoặc video cho site.
 *       - File upload: image, video (qua Cloudinary)
 *       - URL: YouTube video link
 *       - Note: Model 3D chỉ Manager mới có quyền upload
 *     tags: [Local Guide - Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image, video]
 *                 example: "image"
 *               caption:
 *                 type: string
 *                 example: "Mặt tiền nhà thờ"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File upload (image/video)
 *               url:
 *                 type: string
 *                 example: "https://youtube.com/watch?v=xxx"
 *                 description: YouTube URL (chỉ cho video)
 *     responses:
 *       201:
 *         description: Upload media thành công
 *       400:
 *         description: Loại media không hợp lệ hoặc thiếu file/URL
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Xem danh sách media của tôi (Local Guide only)
 *     description: Lấy danh sách media do Local Guide upload
 *     tags: [Local Guide - Media]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, model_3d]
 *         description: Lọc theo loại media
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
 *       - in: query
 *         name: narrative_status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái duyệt thuyết minh
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/media/{id}:
 *   put:
 *     summary: Cập nhật media (Local Guide only)
 *     description: Chỉ cập nhật được media pending hoặc rejected
 *     tags: [Local Guide - Media]
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
 *               type:
 *                 type: string
 *                 enum: [image, video]
 *               caption:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể cập nhật media đã được duyệt
 *       404:
 *         description: Không tìm thấy media
 *
 *   delete:
 *     summary: Xóa media (Local Guide only)
 *     description: Chỉ xóa được media pending hoặc rejected
 *     tags: [Local Guide - Media]
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
 *       400:
 *         description: Không thể xóa media đã được duyệt
 *       404:
 *         description: Không tìm thấy media
 */

/**
 * @swagger
 * /api/local-guide/media/{id}/restore:
 *   patch:
 *     summary: Khôi phục media đã xóa (Local Guide only)
 *     description: |
 *       Khôi phục media đã bị soft delete (is_active: false).
 *       - Chỉ khôi phục được media pending hoặc rejected
 *       - Không thể khôi phục media đã approved
 *     tags: [Local Guide - Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của media cần khôi phục
 *     responses:
 *       200:
 *         description: Khôi phục thành công
 *       400:
 *         description: |
 *           - Không thể khôi phục media đã được duyệt
 *           - Media đã được kích hoạt
 *       404:
 *         description: Không tìm thấy media
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */
