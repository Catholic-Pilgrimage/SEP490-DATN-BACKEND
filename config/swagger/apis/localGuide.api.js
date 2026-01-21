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


// ============================================
// MASS SCHEDULE ROUTES
// ============================================

/**
 * @swagger
 * /api/local-guide/schedules:
 *   post:
 *     summary: Tạo lịch lễ (Local Guide only)
 *     description: |
 *       Local Guide tạo lịch lễ cho site được gán.
 *       Lịch lễ sẽ ở trạng thái **pending** cho tới khi Manager duyệt.
 *
 *       **Lưu ý**: Phải chọn ít nhất 1 ngày trong tuần.
 *       - Hàng ngày: gửi `[0,1,2,3,4,5,6]`
 *       - T2-T6: gửi `[1,2,3,4,5]`
 *       - Chỉ CN: gửi `[0]`
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - days_of_week
 *               - time
 *             properties:
 *               days_of_week:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *                 minItems: 1
 *                 description: |
 *                   Mảng các ngày trong tuần (0-6):
 *                   - `0`: Chủ nhật
 *                   - `1`: Thứ 2
 *                   - `2`: Thứ 3
 *                   - `3`: Thứ 4
 *                   - `4`: Thứ 5
 *                   - `5`: Thứ 6
 *                   - `6`: Thứ 7
 *
 *                   Ví dụ:
 *                   - `[0,1,2,3,4,5,6]`: Hàng ngày
 *                   - `[1,2,3,4,5]`: T2 đến T6
 *                   - `[0]`: Chỉ Chủ nhật
 *                 example: [1, 2, 3, 4, 5]
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Giờ lễ (HH:mm)
 *                 example: "17:30"
 *               note:
 *                 type: string
 *                 description: Ghi chú (optional)
 *                 example: "Lễ chiều ngày thường"
 *     responses:
 *       201:
 *         description: Tạo thành công (trạng thái pending)
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
 *                   example: "Tạo lịch lễ thành công"
 *                 data:
 *                   $ref: '#/components/schemas/MassSchedule'
 *       400:
 *         description: |
 *           - Giờ lễ không được để trống
 *           - Vui lòng chọn ít nhất 1 ngày trong tuần
 *           - Ngày trong tuần không hợp lệ
 *           - Local Guide chưa có site
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Danh sách lịch lễ của tôi (Local Guide only)
 *     description: |
 *       Local Guide xem danh sách lịch lễ **do mình tạo** với filter và pagination.
 *       Chỉ hiển thị lịch lễ của user hiện tại, không thấy của Local Guide khác.
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Lọc lịch lễ có chứa ngày này (0=CN, 1=T2, ..., 6=T7)
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
 *                   example: "Lấy danh sách lịch lễ thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MassSchedule'
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
 *                           example: 5
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/schedules/{id}:
 *   put:
 *     summary: Cập nhật lịch lễ (Local Guide only)
 *     description: |
 *       Local Guide cập nhật lịch lễ **do mình tạo**.
 *       - Chỉ có thể cập nhật lịch lễ ở trạng thái `pending` hoặc `rejected`
 *       - Nếu lịch lễ bị `rejected`, sau khi cập nhật sẽ tự động reset về `pending`
 *       - Không thể cập nhật lịch lễ đã `approved`
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
 *         description: ID của lịch lễ cần cập nhật
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days_of_week:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *                 minItems: 1
 *                 description: Mảng các ngày trong tuần (0-6)
 *                 example: [0, 6]
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Giờ lễ (HH:mm)
 *               note:
 *                 type: string
 *                 description: Ghi chú
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
 *                   example: "Cập nhật lịch lễ thành công"
 *                 data:
 *                   $ref: '#/components/schemas/MassSchedule'
 *       400:
 *         description: |
 *           - Không thể cập nhật lịch lễ đã được duyệt
 *           - Ngày trong tuần không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy lịch lễ (hoặc không phải của bạn)
 *
 *   delete:
 *     summary: Xóa lịch lễ (Local Guide only)
 *     description: |
 *       Local Guide xóa lịch lễ **do mình tạo**.
 *       - Chỉ có thể xóa lịch lễ ở trạng thái `pending` hoặc `rejected`
 *       - Không thể xóa lịch lễ đã `approved`
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
 *         description: ID của lịch lễ cần xóa
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
 *                   example: "Xóa lịch lễ thành công"
 *       400:
 *         description: Không thể xóa lịch lễ đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy lịch lễ (hoặc không phải của bạn)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MassSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "MS0115001"
 *           description: Mã lịch lễ (auto-generated)
 *         days_of_week:
 *           type: array
 *           items:
 *             type: integer
 *           description: |
 *             Mảng các ngày trong tuần:
 *             - `[0,1,2,3,4,5,6]`: Hàng ngày
 *             - `[1,2,3,4,5]`: T2-T6
 *             - `[0]`: Chỉ CN
 *           example: [1, 2, 3, 4, 5]
 *         time:
 *           type: string
 *           format: time
 *           example: "17:30:00"
 *         note:
 *           type: string
 *           example: "Lễ chiều ngày thường"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: "pending"
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           example: true
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


// ============================================
// EVENT ROUTES
// ============================================

/**
 * @swagger
 * /api/local-guide/events:
 *   post:
 *     summary: Tạo sự kiện (Local Guide only)
 *     description: |
 *       Local Guide tạo sự kiện cho site được gán.
 *       Sự kiện sẽ ở trạng thái **pending** cho tới khi Manager duyệt.
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
 *               - name
 *               - start_date
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Tên sự kiện
 *                 example: "Lễ Giáng Sinh 2025"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Mô tả chi tiết sự kiện
 *                 example: "Thánh lễ mừng Chúa Giáng Sinh với chương trình văn nghệ đặc sắc"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày bắt đầu (YYYY-MM-DD)
 *                 example: "2025-12-25"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày kết thúc (optional, phải >= start_date)
 *                 example: "2025-12-25"
 *               start_time:
 *                 type: string
 *                 description: Giờ bắt đầu (HH:MM)
 *                 example: "20:00"
 *               end_time:
 *                 type: string
 *                 description: Giờ kết thúc (HH:MM)
 *                 example: "22:00"
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 description: Địa điểm tổ chức (nếu khác site)
 *                 example: "Sân nhà thờ"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh banner sự kiện (optional)
 *     responses:
 *       201:
 *         description: Tạo thành công (trạng thái pending)
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
 *                   example: "Tạo sự kiện thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: |
 *           - Tên sự kiện không được để trống
 *           - Ngày bắt đầu không được để trống
 *           - Ngày kết thúc phải sau ngày bắt đầu
 *           - Local Guide chưa có site
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Danh sách sự kiện của tôi (Local Guide only)
 *     description: |
 *       Local Guide xem danh sách sự kiện **do mình tạo** với filter và pagination.
 *       Chỉ hiển thị sự kiện của user hiện tại, không thấy của Local Guide khác.
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
 *                   example: "Lấy danh sách sự kiện thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
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
 *                           example: 5
 *                         totalPages:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/events/{id}:
 *   put:
 *     summary: Cập nhật sự kiện (Local Guide only)
 *     description: |
 *       Local Guide cập nhật sự kiện **do mình tạo**.
 *       - Chỉ có thể cập nhật sự kiện ở trạng thái `pending` hoặc `rejected`
 *       - Nếu sự kiện bị `rejected`, sau khi cập nhật sẽ tự động reset về `pending`
 *       - Không thể cập nhật sự kiện đã `approved`
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
 *         description: ID của sự kiện cần cập nhật
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Tên sự kiện
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Mô tả chi tiết
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày bắt đầu (YYYY-MM-DD)
 *               end_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày kết thúc
 *               start_time:
 *                 type: string
 *                 description: Giờ bắt đầu (HH:MM)
 *               end_time:
 *                 type: string
 *                 description: Giờ kết thúc (HH:MM)
 *               location:
 *                 type: string
 *                 maxLength: 255
 *                 description: Địa điểm tổ chức
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh banner mới
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
 *                   example: "Cập nhật sự kiện thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: |
 *           - Không thể cập nhật sự kiện đã được duyệt
 *           - Ngày kết thúc phải sau ngày bắt đầu
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy sự kiện (hoặc không phải của bạn)
 *
 *   delete:
 *     summary: Xóa sự kiện (Local Guide only)
 *     description: |
 *       Local Guide xóa sự kiện **do mình tạo**.
 *       - Chỉ có thể xóa sự kiện ở trạng thái `pending` hoặc `rejected`
 *       - Không thể xóa sự kiện đã `approved`
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
 *         description: ID của sự kiện cần xóa
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
 *                   example: "Xóa sự kiện thành công"
 *       400:
 *         description: Không thể xóa sự kiện đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Không tìm thấy sự kiện (hoặc không phải của bạn)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "EVT0116001"
 *           description: Mã sự kiện (auto-generated)
 *         name:
 *           type: string
 *           example: "Lễ Giáng Sinh 2025"
 *         description:
 *           type: string
 *           example: "Thánh lễ mừng Chúa Giáng Sinh"
 *         start_date:
 *           type: string
 *           format: date
 *           example: "2025-12-25"
 *         end_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2025-12-25"
 *         start_time:
 *           type: string
 *           format: time
 *           nullable: true
 *           example: "20:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           nullable: true
 *           example: "22:00:00"
 *         location:
 *           type: string
 *           nullable: true
 *           example: "Sân nhà thờ"
 *         banner_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://res.cloudinary.com/xxx/image/upload/v1234/banner.jpg"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: "pending"
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           example: true
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


// ============================================
// SHIFT SUBMISSION ROUTES
// ============================================

/**
 * @swagger
 * /api/local-guide/shift-submissions:
 *   post:
 *     summary: Tạo đăng ký lịch làm việc (Local Guide only)
 *     description: |
 *       Local Guide đăng ký lịch làm việc cho một tuần cụ thể.
 *       
 *       **Flow:**
 *       1. Tạo submission mới với `week_start_date` và `shifts`
 *       2. Submission có status `pending`, chờ Manager duyệt
 *       3. Nếu muốn sửa lịch đã được approved, phải gửi submission mới với `previous_submission_id`
 *       
 *       **Validation rules:**
 *       - Mỗi ca làm việc tối đa 12 tiếng
 *       - Không được trùng ca trong cùng submission
 *       - Phải nằm trong giờ mở cửa của site (nếu có)
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubmissionRequest'
 *           example:
 *             week_start_date: "2026-01-27"
 *             shifts:
 *               - day_of_week: 1
 *                 start_time: "08:00"
 *                 end_time: "12:00"
 *               - day_of_week: 3
 *                 start_time: "14:00"
 *                 end_time: "18:00"
 *               - day_of_week: 5
 *                 start_time: "08:00"
 *                 end_time: "16:00"
 *     responses:
 *       201:
 *         description: Tạo submission thành công
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
 *                   example: "Đăng ký lịch làm việc thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     submission:
 *                       $ref: '#/components/schemas/GuideShiftSubmission'
 *                     shifts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GuideShift'
 *                     errors:
 *                       type: array
 *                       nullable: true
 *       400:
 *         description: |
 *           - Đã có submission pending cho tuần này
 *           - Không có shifts hợp lệ
 *           - Change reason required (khi update)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Xem danh sách submissions của tôi (Local Guide only)
 *     description: Lấy danh sách submissions lịch làm việc của Local Guide
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: week_start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc theo tuần (ngày đầu tuần)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GuideShiftSubmission'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/shift-submissions/{id}:
 *   get:
 *     summary: Xem chi tiết submission (Local Guide only)
 *     description: Lấy thông tin chi tiết một submission
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
 *         description: ID của submission
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
 *                 data:
 *                   $ref: '#/components/schemas/GuideShiftSubmission'
 *       404:
 *         description: Không tìm thấy submission
 *
 *   put:
 *     summary: Cập nhật submission (Local Guide only)
 *     description: |
 *       Cập nhật toàn bộ danh sách shifts trong submission.
 *       Chỉ có thể sửa submission có status = 'pending' hoặc 'rejected'.
 *       Nếu submission bị rejected, sẽ tự động reset về pending sau khi update.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubmissionRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Submission không tìm thấy hoặc đã được approved
 *
 *   delete:
 *     summary: Xóa submission pending (Local Guide only)
 *     description: Xóa submission đang pending. Không thể xóa submission đã approved/rejected.
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
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Submission không tìm thấy hoặc không phải pending
 */

/**
 * @swagger
 * /api/local-guide/site-schedule:
 *   get:
 *     summary: Xem lịch toàn site (calendar view)
 *     description: |
 *       Lấy lịch làm việc của tất cả Local Guide trong site cho tuần cụ thể.
 *       Dùng để hiển thị calendar và biết slot nào đã có người đăng ký.
 *     tags: [Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: week_start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày đầu tuần (Thứ 2)
 *         example: "2026-01-27"
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     week_start_date:
 *                       type: string
 *                       format: date
 *                     site_id:
 *                       type: string
 *                       format: uuid
 *                     site_name:
 *                       type: string
 *                     opening_hours:
 *                       type: object
 *                     schedule:
 *                       type: object
 *                       description: Lịch theo ngày (0-6)
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             shift_id:
 *                               type: string
 *                               format: uuid
 *                             submission_id:
 *                               type: string
 *                               format: uuid
 *                             start_time:
 *                               type: string
 *                             end_time:
 *                               type: string
 *                             guide_name:
 *                               type: string
 *                             status:
 *                               type: string
 *                               enum: [pending, approved]
 *                             is_mine:
 *                               type: boolean
 *       400:
 *         description: week_start_date không được để trống
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */
