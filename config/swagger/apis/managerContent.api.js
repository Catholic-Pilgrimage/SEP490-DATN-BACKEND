/**
 * @swagger
 * tags:
 *   - name: Manager Content
 *     description: Manager Content Approval (Media, Schedule, Event)
 */

/**
 * @swagger
 * /api/manager/content/media:
 *   get:
 *     summary: Danh sách media của site (Manager only)
 *     description: Manager xem tất cả media của site được gán với filter và pagination
 *     tags: [Manager Content]
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
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
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
 *                         $ref: '#/components/schemas/SiteMediaWithCreator'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 */

/**
 * @swagger
 * /api/manager/content/media/{id}/status:
 *   patch:
 *     summary: Duyệt hoặc Từ chối media (Manager only)
 *     description: |
 *       Manager approve hoặc reject media của site.
 *       - **approved**: Duyệt media
 *       - **rejected**: Từ chối media (bắt buộc có lý do)
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *                 example: "rejected"
 *               rejection_reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc khi status=rejected)
 *                 example: "Ảnh không rõ nét, vui lòng upload lại"
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
 *                   example: "Từ chối media thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SiteMedia'
 *       400:
 *         description: |
 *           - Trạng thái không hợp lệ
 *           - Media đã được duyệt/từ chối trước đó
 *           - Thiếu lý do từ chối
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy media
 */

/**
 * @swagger
 * /api/manager/content/media/{id}/is-active:
 *   patch:
 *     summary: Ẩn/Hiện media (Soft delete/Restore)
 *     description: |
 *       Manager toggle trạng thái is_active của media:
 *       - `is_active: false` → Ẩn media (soft delete)
 *       - `is_active: true` → Khôi phục media
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Trạng thái active (true = hiện, false = ẩn)
 *                 example: false
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
 *                   example: "Ẩn media thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SiteMedia'
 *       400:
 *         description: Giá trị is_active không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
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
 *         site_id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "IMG0115001"
 *         url:
 *           type: string
 *           format: uri
 *         type:
 *           type: string
 *           enum: [image, video, panorama]
 *         caption:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           description: Trạng thái active (false = đã ẩn)
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     SiteMediaWithCreator:
 *       allOf:
 *         - $ref: '#/components/schemas/SiteMedia'
 *         - type: object
 *           properties:
 *             creator:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 full_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *
 *     MassScheduleWithCreator:
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
 *         days_of_week:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1, 2, 3, 4, 5]
 *           description: "Mảng các ngày trong tuần (0=CN, 1=T2, ..., 6=T7)"
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
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         creator:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 */

// ===================== SCHEDULES =====================

/**
 * @swagger
 * /api/manager/content/schedules:
 *   get:
 *     summary: Danh sách lịch lễ của site (Manager only)
 *     description: |
 *       Manager xem tất cả lịch lễ của site được gán với filter và pagination.
 *       Bao gồm thông tin người tạo (Local Guide).
 *     tags: [Manager Content]
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
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
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
 *                         $ref: '#/components/schemas/MassScheduleWithCreator'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 */

/**
 * @swagger
 * /api/manager/content/schedules/{id}/status:
 *   patch:
 *     summary: Duyệt hoặc Từ chối lịch lễ (Manager only)
 *     description: |
 *       Manager approve hoặc reject lịch lễ của site.
 *       - **approved**: Duyệt lịch lễ
 *       - **rejected**: Từ chối lịch lễ (bắt buộc có lý do)
 *
 *       Chỉ có thể duyệt/từ chối lịch lễ đang ở trạng thái `pending`.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch lễ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *                 example: "approved"
 *               rejection_reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc khi status=rejected)
 *                 example: "Giờ lễ trùng với lịch đã có"
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
 *                   example: "Duyệt lịch lễ thành công"
 *                 data:
 *                   $ref: '#/components/schemas/MassScheduleWithCreator'
 *       400:
 *         description: |
 *           - Trạng thái không hợp lệ
 *           - Lịch lễ đã được duyệt/từ chối trước đó
 *           - Thiếu lý do từ chối
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy lịch lễ
 */

/**
 * @swagger
 * /api/manager/content/schedules/{id}/is-active:
 *   patch:
 *     summary: Ẩn/Hiện lịch lễ (Soft delete/Restore)
 *     description: |
 *       Manager toggle trạng thái is_active của lịch lễ:
 *       - `is_active: false` → Ẩn lịch lễ (soft delete)
 *       - `is_active: true` → Khôi phục lịch lễ
 *
 *       Chỉ có thể ẩn/hiện lịch lễ đã được **approved**.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch lễ
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Trạng thái active (true = hiện, false = ẩn)
 *                 example: false
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
 *                   example: "Ẩn lịch lễ thành công"
 *                 data:
 *                   $ref: '#/components/schemas/MassScheduleWithCreator'
 *       400:
 *         description: |
 *           - Giá trị is_active không hợp lệ
 *           - Chỉ có thể ẩn/hiện lịch lễ đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy lịch lễ
 */

// ===================== EVENTS =====================

/**
 * @swagger
 * /api/manager/content/events:
 *   get:
 *     summary: Danh sách sự kiện của site (Manager only)
 *     description: |
 *       Manager xem tất cả sự kiện của site được gán với filter và pagination.
 *       Bao gồm thông tin người tạo (Local Guide).
 *     tags: [Manager Content]
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
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
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
 *                         $ref: '#/components/schemas/EventWithCreator'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 */

/**
 * @swagger
 * /api/manager/content/events/{id}/status:
 *   patch:
 *     summary: Duyệt hoặc Từ chối sự kiện (Manager only)
 *     description: |
 *       Manager approve hoặc reject sự kiện của site.
 *       - **approved**: Duyệt sự kiện
 *       - **rejected**: Từ chối sự kiện (bắt buộc có lý do)
 *
 *       Chỉ có thể duyệt/từ chối sự kiện đang ở trạng thái `pending`.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của sự kiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *                 example: "approved"
 *               rejection_reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc khi status=rejected)
 *                 example: "Thông tin sự kiện chưa đầy đủ"
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
 *                   example: "Duyệt sự kiện thành công"
 *                 data:
 *                   $ref: '#/components/schemas/EventWithCreator'
 *       400:
 *         description: |
 *           - Trạng thái không hợp lệ
 *           - Sự kiện đã được duyệt/từ chối trước đó
 *           - Thiếu lý do từ chối
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy sự kiện
 */

/**
 * @swagger
 * /api/manager/content/events/{id}/is-active:
 *   patch:
 *     summary: Ẩn/Hiện sự kiện (Soft delete/Restore)
 *     description: |
 *       Manager toggle trạng thái is_active của sự kiện:
 *       - `is_active: false` → Ẩn sự kiện (soft delete)
 *       - `is_active: true` → Khôi phục sự kiện
 *
 *       Chỉ có thể ẩn/hiện sự kiện đã được **approved**.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của sự kiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Trạng thái active (true = hiện, false = ẩn)
 *                 example: false
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
 *                   example: "Ẩn sự kiện thành công"
 *                 data:
 *                   $ref: '#/components/schemas/EventWithCreator'
 *       400:
 *         description: |
 *           - Giá trị is_active không hợp lệ
 *           - Chỉ có thể ẩn/hiện sự kiện đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy sự kiện
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EventWithCreator:
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
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         creator:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 */

// ===================== NEARBY PLACES =====================

/**
 * @swagger
 * /api/manager/content/nearby-places:
 *   get:
 *     summary: Danh sách địa điểm lân cận của site (Manager only)
 *     description: |
 *       Manager xem tất cả địa điểm lân cận của site được gán với filter và pagination.
 *       Bao gồm thông tin người đề xuất (Local Guide).
 *     tags: [Manager Content]
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
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, lodging, medical]
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
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
 *                   example: "Lấy danh sách địa điểm lân cận thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/NearbyPlaceWithProposer'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 */

/**
 * @swagger
 * /api/manager/content/nearby-places/{id}/status:
 *   patch:
 *     summary: Duyệt hoặc Từ chối địa điểm lân cận (Manager only)
 *     description: |
 *       Manager approve hoặc reject địa điểm lân cận của site.
 *       - **approved**: Duyệt địa điểm lân cận
 *       - **rejected**: Từ chối địa điểm lân cận (bắt buộc có lý do)
 *       
 *       Chỉ có thể duyệt/từ chối địa điểm lân cận đang ở trạng thái `pending`.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm lân cận
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *                 example: "approved"
 *               rejection_reason:
 *                 type: string
 *                 maxLength: 500
 *                 description: Lý do từ chối (bắt buộc khi status=rejected)
 *                 example: "Địa điểm quá xa, không phù hợp"
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
 *                   example: "Duyệt địa điểm lân cận thành công"
 *                 data:
 *                   $ref: '#/components/schemas/NearbyPlaceWithProposer'
 *       400:
 *         description: |
 *           - Trạng thái không hợp lệ
 *           - Địa điểm lân cận đã được duyệt/từ chối trước đó
 *           - Thiếu lý do từ chối
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy địa điểm lân cận
 */

/**
 * @swagger
 * /api/manager/content/nearby-places/{id}/is-active:
 *   patch:
 *     summary: Ẩn/Hiện địa điểm lân cận (Soft delete/Restore)
 *     description: |
 *       Manager toggle trạng thái is_active của địa điểm lân cận:
 *       - `is_active: false` → Ẩn địa điểm lân cận (soft delete)
 *       - `is_active: true` → Khôi phục địa điểm lân cận
 *       
 *       Chỉ có thể ẩn/hiện địa điểm lân cận đã được **approved**.
 *     tags: [Manager Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm lân cận
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: Trạng thái active (true = hiện, false = ẩn)
 *                 example: false
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
 *                   example: "Ẩn địa điểm lân cận thành công"
 *                 data:
 *                   $ref: '#/components/schemas/NearbyPlaceWithProposer'
 *       400:
 *         description: |
 *           - Giá trị is_active không hợp lệ
 *           - Chỉ có thể ẩn/hiện địa điểm lân cận đã được duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Manager
 *       404:
 *         description: Không tìm thấy địa điểm lân cận
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NearbyPlaceWithProposer:
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
 *           example: "NBP0122001"
 *         proposed_by:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Nhà hàng Phở 24"
 *         category:
 *           type: string
 *           enum: [food, lodging, medical]
 *           example: "food"
 *         address:
 *           type: string
 *           example: "123 Đường ABC, Quận 1"
 *         latitude:
 *           type: number
 *           format: float
 *           example: 10.779738
 *         longitude:
 *           type: number
 *           format: float
 *           example: 106.699092
 *         distance_meters:
 *           type: integer
 *           example: 500
 *         phone:
 *           type: string
 *           example: "0901234567"
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         reviewed_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           description: Trạng thái active (false = đã ẩn)
 *         created_at:
 *           type: string
 *           format: date-time
 *         proposer:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 */
