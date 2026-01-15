/**
 * @swagger
 * tags:
 *   - name: Local Guide
 *     description: API cho Local Guide (quản lý site được gán)
 */

/**
 * @swagger
 * /api/local-guide/site:
 *   get:
 *     summary: Xem thông tin địa điểm được gán (Local Guide only)
 *     description: Local Guide xem chi tiết địa điểm mà mình được gán vào
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
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
 *                   example: "Lấy thông tin địa điểm thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                       example: "CHNAM001"
 *                     name:
 *                       type: string
 *                       example: "Nhà thờ Đức Bà Sài Gòn"
 *                     description:
 *                       type: string
 *                     history:
 *                       type: string
 *                     address:
 *                       type: string
 *                       example: "01 Công xã Paris, Bến Nghé, Quận 1"
 *                     province:
 *                       type: string
 *                       example: "Hồ Chí Minh"
 *                     district:
 *                       type: string
 *                       example: "Quận 1"
 *                     latitude:
 *                       type: number
 *                       example: 10.779738
 *                     longitude:
 *                       type: number
 *                       example: 106.699092
 *                     region:
 *                       type: string
 *                       enum: [Bac, Trung, Nam]
 *                     type:
 *                       type: string
 *                       enum: [church, shrine, monastery, center, other]
 *                     patron_saint:
 *                       type: string
 *                     cover_image:
 *                       type: string
 *                     opening_hours:
 *                       type: object
 *                     contact_info:
 *                       type: object
 *                     is_active:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Local Guide chưa được gán địa điểm
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/media:
 *   post:
 *     summary: Upload media cho site (Local Guide only)
 *     description: |
 *       Local Guide upload media cho site được gán. Hỗ trợ 2 cách:
 *       - **File upload**: Ảnh, video file, panorama 360 (upload lên Cloudinary)
 *       - **YouTube URL**: Chỉ dành cho video (nhập link YouTube)
 *       
 *       Media sẽ ở trạng thái **pending** cho tới khi Manager duyệt.
 *     tags: [Local Guide]
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
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File media (bắt buộc nếu không có url)
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: YouTube URL (chỉ dùng cho type=video, bắt buộc nếu không có file)
 *                 example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *               type:
 *                 type: string
 *                 enum: [image, video, panorama]
 *                 description: |
 *                   - `image`: Ảnh gallery (chỉ file upload)
 *                   - `video`: Video (file upload hoặc YouTube URL)
 *                   - `panorama`: Ảnh 360° (chỉ file upload)
 *                 example: "video"
 *               caption:
 *                 type: string
 *                 maxLength: 255
 *                 description: Mô tả ngắn cho media
 *                 example: "Video giới thiệu nhà thờ"
 *     responses:
 *       201:
 *         description: Upload thành công (trạng thái pending)
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
 *                   example: "Tải lên media thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SiteMedia'
 *       400:
 *         description: |
 *           - Dữ liệu không hợp lệ
 *           - Local Guide chưa có site
 *           - Link YouTube không hợp lệ
 *           - Thiếu file hoặc URL
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Danh sách media của site (Local Guide only)
 *     description: Local Guide xem tất cả media của site được gán với filter và pagination
 *     tags: [Local Guide]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, panorama]
 *         description: Lọc theo loại media
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Thành công
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
 *                   example: "Lấy danh sách media thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SiteMedia'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
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
 *     description: |
 *       Local Guide cập nhật media của site.
 *       **Lưu ý**: Chỉ có thể cập nhật media đang ở trạng thái `pending`.
 *       
 *       Có thể cập nhật:
 *       - `caption`: Mô tả
 *       - `type`: Loại media
 *       - `file`: Thay file mới (upload Cloudinary)
 *       - `url`: Thay YouTube URL (chỉ cho video)
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của media cần cập nhật
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File media mới (optional)
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: YouTube URL mới (optional, chỉ cho video)
 *                 example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *               type:
 *                 type: string
 *                 enum: [image, video, panorama]
 *                 description: Loại media mới (optional)
 *               caption:
 *                 type: string
 *                 maxLength: 255
 *                 description: Mô tả mới (optional)
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
 *                 message:
 *                   type: string
 *                   example: "Cập nhật media thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SiteMedia'
 *       400:
 *         description: |
 *           - Chỉ có thể cập nhật media đang chờ duyệt
 *           - Link YouTube không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy media
 *
 *   delete:
 *     summary: Xóa media (Local Guide only)
 *     description: |
 *       Local Guide xóa media của site. 
 *       **Lưu ý**: Chỉ có thể xóa media đang ở trạng thái `pending`. 
 *       Media đã `approved` không thể xóa (cần liên hệ Manager).
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của media cần xóa
 *         example: "550e8400-e29b-41d4-a716-446655440000"
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
 *                 message:
 *                   type: string
 *                   example: "Xóa media thành công"
 *       400:
 *         description: Không thể xóa media đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy media
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SiteMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         site_id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/xxx/image/upload/v1234/panorama.jpg"
 *         type:
 *           type: string
 *           enum: [image, video, panorama]
 *           example: "panorama"
 *         caption:
 *           type: string
 *           example: "Toàn cảnh nhà thờ"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: |
 *             - `pending`: Đang chờ duyệt
 *             - `approved`: Đã duyệt (hiển thị cho public)
 *             - `rejected`: Bị từ chối
 *           example: "pending"
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
