/**
 * @swagger
 * tags:
 *   - name: Public Sites
 *     description: API công khai xem địa điểm (Guest & Pilgrim)
 *   - name: Admin Sites
 *     description: API quản lý địa điểm (Admin)
 *   - name: Manager Sites
 *     description: API quản lý địa điểm (Manager)
 */

// ============================================
// PUBLIC SITE ROUTES (Guest & Pilgrim)
// ============================================

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Xem danh sách địa điểm công khai (Public - không cần đăng nhập)
 *     description: Lấy danh sách tất cả địa điểm đang hoạt động (is_active = true)
 *     tags: [Public Sites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *           example: "Hồ Chí Minh"
 *         description: Lọc theo tỉnh/thành phố
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *           example: "Nam"
 *         description: Lọc theo miền
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *           example: "church"
 *         description: Lọc theo loại địa điểm
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Đức Bà"
 *         description: Tìm kiếm theo tên địa điểm
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                         example: "CHNAM001"
 *                       name:
 *                         type: string
 *                         example: "Nhà thờ Đức Bà Sài Gòn"
 *                       description:
 *                         type: string
 *                       address:
 *                         type: string
 *                       province:
 *                         type: string
 *                       district:
 *                         type: string
 *                       region:
 *                         type: string
 *                         enum: [Bac, Trung, Nam]
 *                       type:
 *                         type: string
 *                         enum: [church, shrine, monastery, center, other]
 *                       patron_saint:
 *                         type: string
 *                       cover_image:
 *                         type: string
 *                       opening_hours:
 *                         type: object
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/sites/{idOrCode}:
 *   get:
 *     summary: Xem chi tiết địa điểm (Public - không cần đăng nhập)
 *     description: Lấy thông tin chi tiết địa điểm bằng ID hoặc code
 *     tags: [Public Sites]
 *     parameters:
 *       - in: path
 *         name: idOrCode
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID hoặc code của địa điểm
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: Tìm bằng UUID
 *           code:
 *             value: "CHNAM001"
 *             summary: Tìm bằng code
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
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
 *                     province:
 *                       type: string
 *                     district:
 *                       type: string
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
 *                       example: {"open": "06:00", "close": "18:00"}
 *                     contact_info:
 *                       type: object
 *                       example: {"phone": "028-3822-0477"}
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/sites/{siteId}/media:
 *   get:
 *     summary: Xem gallery của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách hình ảnh/video đã được duyệt của địa điểm
 *     tags: [Public Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, panorama]
 *         description: Lọc theo loại media
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       url:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [image, video, panorama]
 *                       caption:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 */

/**
 * @swagger
 * /api/sites/{siteId}/mass-schedules:
 *   get:
 *     summary: Xem lịch lễ của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách lịch lễ đã được duyệt của địa điểm
 *     tags: [Public Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Lọc theo ngày trong tuần (0=CN, 1=T2, ..., 6=T7)
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       days_of_week:
 *                         type: array
 *                         items:
 *                           type: integer
 *                       time:
 *                         type: string
 *                         example: "06:00:00"
 *                       note:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 */

/**
 * @swagger
 * /api/sites/{siteId}/events:
 *   get:
 *     summary: Xem sự kiện của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách sự kiện đã được duyệt của địa điểm
 *     tags: [Public Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
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
 *         name: upcoming
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Chỉ lấy sự kiện sắp diễn ra (start_date >= hôm nay)
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       start_time:
 *                         type: string
 *                       end_time:
 *                         type: string
 *                       location:
 *                         type: string
 *                       banner_url:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 */


// ============================================
// MANAGER SITE ROUTES
// ============================================

/**
 * @swagger
 * /api/manager/sites:
 *   post:
 *     summary: Tạo địa điểm mới (Manager only - max 1 site)
 *     description: Manager chỉ được tạo 1 site duy nhất, site sẽ được tự động phê duyệt.
 *     tags: [Manager Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nhà thờ Đức Bà Sài Gòn"
 *                 description: Tên địa điểm
 *               description:
 *                 type: string
 *                 example: "Nhà thờ chính tòa của Tổng Giáo phận Sài Gòn"
 *               history:
 *                 type: string
 *                 example: "Được xây dựng từ năm 1863-1880 bởi người Pháp"
 *               address:
 *                 type: string
 *                 example: "01 Công xã Paris, Bến Nghé"
 *               province:
 *                 type: string
 *                 example: "Hồ Chí Minh"
 *               district:
 *                 type: string
 *                 example: "Quận 1"
 *               latitude:
 *                 type: number
 *                 example: 10.779738
 *               longitude:
 *                 type: number
 *                 example: 106.699092
 *               region:
 *                 type: string
 *                 enum: [Bac, Trung, Nam]
 *                 example: "Nam"
 *               type:
 *                 type: string
 *                 enum: [church, shrine, monastery, center, other]
 *                 example: "church"
 *               patron_saint:
 *                 type: string
 *                 example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *               cover_image:
 *                 type: string
 *                 format: binary
 *               opening_hours:
 *                 type: string
 *                 example: '{"monday":"05:00-18:00","sunday":"05:00-20:00"}'
 *                 description: JSON string
 *               contact_info:
 *                 type: string
 *                 example: '{"phone":"028-3822-0477","email":"contact@example.com"}'
 *                 description: JSON string
 *     responses:
 *       201:
 *         description: Tạo địa điểm thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       403:
 *         description: Chỉ Manager mới có thể tạo site
 *       409:
 *         description: Manager đã có site hoặc site đã tồn tại
 *   get:
 *     summary: Xem địa điểm của tôi (Manager only)
 *     tags: [Manager Sites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteResponse'
 *       404:
 *         description: Manager chưa có địa điểm
 *   put:
 *     summary: Cập nhật địa điểm của tôi (Manager only)
 *     description: Manager có thể cập nhật thông tin site nhưng không thể thay đổi region, type
 *     tags: [Manager Sites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nhà thờ Đức Bà Sài Gòn"
 *               description:
 *                 type: string
 *                 example: "Nhà thờ chính tòa của Tổng Giáo phận Sài Gòn"
 *               history:
 *                 type: string
 *                 example: "Được xây dựng từ năm 1863-1880"
 *               address:
 *                 type: string
 *                 example: "01 Công xã Paris, Bến Nghé"
 *               province:
 *                 type: string
 *                 example: "Hồ Chí Minh"
 *               district:
 *                 type: string
 *                 example: "Quận 1"
 *               latitude:
 *                 type: number
 *                 example: 10.779738
 *               longitude:
 *                 type: number
 *                 example: 106.699092
 *               patron_saint:
 *                 type: string
 *                 example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *               cover_image:
 *                 type: string
 *                 format: binary
 *               opening_hours:
 *                 type: string
 *                 example: '{"monday":"05:00-18:00","sunday":"05:00-20:00"}'
 *               contact_info:
 *                 type: string
 *                 example: '{"phone":"028-3822-0477"}'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Manager chưa có địa điểm
 *       409:
 *         description: Địa điểm đã tồn tại
 */

// ============================================
// ADMIN SITE ROUTES
// ============================================

/**
 * @swagger
 * /api/admin/sites:
 *   get:
 *     summary: Lấy danh sách địa điểm (Admin only)
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *           example: "Nam"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *           example: "church"
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *           example: true
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Đức Bà"
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{id}:
 *   get:
 *     summary: Chi tiết địa điểm với stats (Admin only)
 *     description: Lấy thông tin chi tiết địa điểm kèm manager info và statistics
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: "550e8400-e29b-41d4-a716-446655440000"
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
 *                       example: "Nhà thờ Đức Bà"
 *                     description:
 *                       type: string
 *                     history:
 *                       type: string
 *                     address:
 *                       type: string
 *                     province:
 *                       type: string
 *                     district:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
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
 *                     created_by:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     manager:
 *                       type: object
 *                       description: Manager hiện tại của site
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         full_name:
 *                           type: string
 *                           example: "Nguyễn Văn A"
 *                         email:
 *                           type: string
 *                           example: "manager@example.com"
 *                         phone:
 *                           type: string
 *                           example: "0901234567"
 *                         avatar_url:
 *                           type: string
 *                     stats:
 *                       type: object
 *                       description: Thống kê về site
 *                       properties:
 *                         local_guides:
 *                           type: integer
 *                           example: 3
 *                           description: Số lượng local guides
 *                         media:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                               example: 15
 *                             pending:
 *                               type: integer
 *                               example: 2
 *                             approved:
 *                               type: integer
 *                               example: 12
 *                             rejected:
 *                               type: integer
 *                               example: 1
 *                         schedules:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *                             approved:
 *                               type: integer
 *                             rejected:
 *                               type: integer
 *                         events:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *                             approved:
 *                               type: integer
 *                             rejected:
 *                               type: integer
 *                             upcoming:
 *                               type: integer
 *                               description: Số sự kiện sắp diễn ra
 *                         nearby_places:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             pending:
 *                               type: integer
 *                             approved:
 *                               type: integer
 *                             rejected:
 *                               type: integer
 *                         shifts:
 *                           type: object
 *                           properties:
 *                             total_submissions:
 *                               type: integer
 *                               example: 5
 *                             pending:
 *                               type: integer
 *                               example: 2
 *                             approved:
 *                               type: integer
 *                               example: 3
 *                             rejected:
 *                               type: integer
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Không tìm thấy
 *       403:
 *         description: Không có quyền admin
 *   put:
 *     summary: Cập nhật địa điểm (Admin only)
 *     description: Admin có thể cập nhật tất cả thông tin của địa điểm
 *     tags: [Admin Sites]
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
 *               name:
 *                 type: string
 *                 example: "Nhà thờ Đức Bà Sài Gòn"
 *               description:
 *                 type: string
 *                 example: "Nhà thờ chính tòa của Tổng Giáo phận Sài Gòn"
 *               history:
 *                 type: string
 *                 example: "Được xây dựng từ năm 1863-1880"
 *               address:
 *                 type: string
 *                 example: "01 Công xã Paris, Bến Nghé"
 *               province:
 *                 type: string
 *                 example: "Hồ Chí Minh"
 *               district:
 *                 type: string
 *                 example: "Quận 1"
 *               latitude:
 *                 type: number
 *                 example: 10.779738
 *               longitude:
 *                 type: number
 *                 example: 106.699092
 *               region:
 *                 type: string
 *                 enum: [Bac, Trung, Nam]
 *                 example: "Nam"
 *               type:
 *                 type: string
 *                 enum: [church, shrine, monastery, center, other]
 *                 example: "church"
 *               patron_saint:
 *                 type: string
 *                 example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *               cover_image:
 *                 type: string
 *                 format: binary
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               opening_hours:
 *                 type: string
 *                 example: '{"monday":"05:00-18:00"}'
 *               contact_info:
 *                 type: string
 *                 example: '{"phone":"028-3822-0477"}'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy
 *       409:
 *         description: Địa điểm đã tồn tại
 *   delete:
 *     summary: Xóa địa điểm - Soft Delete (Admin only)
 *     tags: [Admin Sites]
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
 *         description: Địa điểm đã bị xóa
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/admin/sites/{id}/restore:
 *   patch:
 *     summary: Khôi phục địa điểm đã xóa (Admin only)
 *     tags: [Admin Sites]
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
 *         description: Địa điểm chưa bị xóa
 *       404:
 *         description: Không tìm thấy
 */

/**
 * @swagger
 * /api/sites/{siteId}/nearby-places:
 *   get:
 *     summary: Lấy danh sách địa điểm lân cận của site (Public)
 *     description: |
 *       API công khai để xem địa điểm lân cận (ăn uống, lưu trú, y tế) gần site.
 *       Chỉ hiển thị địa điểm đã được duyệt (approved).
 *       Sắp xếp theo khoảng cách gần nhất.
 *     tags: [Public Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID hoặc code của site
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
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, lodging, medical]
 *         description: Lọc theo danh mục
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
 *                     site:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                           example: "CHNAM001"
 *                         name:
 *                           type: string
 *                           example: "Nhà thờ Đức Bà Sài Gòn"
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                             example: "NBP0122001"
 *                           name:
 *                             type: string
 *                             example: "Nhà hàng Phở 24"
 *                           category:
 *                             type: string
 *                             enum: [food, lodging, medical]
 *                             example: "food"
 *                           address:
 *                             type: string
 *                             example: "123 Đường ABC, Quận 1"
 *                           latitude:
 *                             type: number
 *                             format: float
 *                             example: 10.779738
 *                           longitude:
 *                             type: number
 *                             format: float
 *                             example: 106.699092
 *                           distance_meters:
 *                             type: integer
 *                             example: 500
 *                             description: Khoảng cách từ site (mét)
 *                           phone:
 *                             type: string
 *                             example: "0901234567"
 *                           description:
 *                             type: string
 *                             example: "Nhà hàng phở truyền thống"
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
 *       404:
 *         description: Không tìm thấy site
 */


// ============================================
// ADMIN SITE DETAIL ROUTES (NEW)
// ============================================

/**
 * @swagger
 * /api/admin/sites/{siteId}/local-guides:
 *   get:
 *     summary: Lấy danh sách Local Guides của site (Admin only)
 *     description: Admin xem tất cả local guides đang làm việc tại site này
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của site
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     site:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                           example: "CHNAM001"
 *                         name:
 *                           type: string
 *                           example: "Nhà thờ Đức Bà"
 *                     guides:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           full_name:
 *                             type: string
 *                             example: "Nguyễn Văn A"
 *                           email:
 *                             type: string
 *                             example: "guide@example.com"
 *                           phone:
 *                             type: string
 *                             example: "0901234567"
 *                           avatar_url:
 *                             type: string
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
 *                         totalPages:
 *                           type: integer
 *       404:
 *         description: Không tìm thấy site
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{siteId}/shifts:
 *   get:
 *     summary: Lấy danh sách lịch trực của site (Admin only)
 *     description: Admin xem tất cả shift submissions (lịch trực) của guides tại site này
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của site
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     site:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                         name:
 *                           type: string
 *                     submissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                             example: "GS012701"
 *                           guide:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           week_start_date:
 *                             type: string
 *                             format: date
 *                           total_shifts:
 *                             type: integer
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           shifts:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 day_of_week:
 *                                   type: integer
 *                                   minimum: 0
 *                                   maximum: 6
 *                                 start_time:
 *                                   type: string
 *                                   example: "08:00:00"
 *                                 end_time:
 *                                   type: string
 *                                   example: "12:00:00"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Không tìm thấy site
 */

/**
 * @swagger
 * /api/admin/sites/{siteId}/media:
 *   get:
 *     summary: Lấy danh sách media của site - All status (Admin only)
 *     description: Admin xem tất cả media (pending, approved, rejected) của site
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, panorama]
 *         description: Lọc theo loại media
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
 *                     site:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                         name:
 *                           type: string
 *                     media:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                           url:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [image, video, panorama]
 *                           caption:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           rejection_reason:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           creator:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Không tìm thấy site
 */

/**
 * @swagger
 * /api/admin/sites/{siteId}/schedules:
 *   get:
 *     summary: Lấy danh sách lịch lễ của site - All status (Admin only)
 *     description: Admin xem tất cả mass schedules (pending, approved, rejected) của site
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
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
 *                     site:
 *                       type: object
 *                     schedules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                           days_of_week:
 *                             type: array
 *                             items:
 *                               type: integer
 *                           time:
 *                             type: string
 *                           note:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           rejection_reason:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           creator:
 *                             type: object
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Không tìm thấy site
 */

/**
 * @swagger
 * /api/admin/sites/{siteId}/events:
 *   get:
 *     summary: Lấy danh sách sự kiện của site - All status (Admin only)
 *     description: Admin xem tất cả events (pending, approved, rejected) của site
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
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
 *                     site:
 *                       type: object
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date
 *                           end_date:
 *                             type: string
 *                             format: date
 *                           start_time:
 *                             type: string
 *                           end_time:
 *                             type: string
 *                           location:
 *                             type: string
 *                           banner_url:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           rejection_reason:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           creator:
 *                             type: object
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Không tìm thấy site
 */

/**
 * @swagger
 * /api/admin/sites/{siteId}/nearby-places:
 *   get:
 *     summary: Lấy danh sách địa điểm gần của site - All status (Admin only)
 *     description: Admin xem tất cả nearby places (pending, approved, rejected) của site
 *     tags: [Admin Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, lodging, medical]
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
 *                     site:
 *                       type: object
 *                     nearby_places:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                             enum: [food, lodging, medical]
 *                           address:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           distance_meters:
 *                             type: integer
 *                           phone:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, approved, rejected]
 *                           rejection_reason:
 *                             type: string
 *                           is_active:
 *                             type: boolean
 *                           proposer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Không tìm thấy site
 */
