/**
 * @swagger
 * tags:
 *   name: Sites
 *   description: API quản lý địa điểm hành hương
 */

/**
 * @swagger
 * /api/admin/sites:
 *   post:
 *     summary: Tạo địa điểm mới (Admin only)
 *     tags: [Sites]
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
 *               - region
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nhà thờ Đức Bà Sài Gòn"
 *                 description: "Tên địa điểm (2-255 ký tự)"
 *               description:
 *                 type: string
 *                 example: "Nhà thờ chính tòa của Tổng Giáo phận Sài Gòn"
 *               history:
 *                 type: string
 *                 example: "Được xây dựng từ năm 1863-1880..."
 *               address:
 *                 type: string
 *                 example: "01 Công xã Paris, Bến Nghé, Quận 1"
 *               province:
 *                 type: string
 *                 example: "Hồ Chí Minh"
 *               district:
 *                 type: string
 *                 example: "Quận 1"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 10.779738
 *                 description: "Vĩ độ (-90 đến 90)"
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 106.699092
 *                 description: "Kinh độ (-180 đến 180)"
 *               region:
 *                 type: string
 *                 enum:
 *                   - Bac
 *                   - Trung
 *                   - Nam
 *                 example: "Nam"
 *                 description: "Vùng miền"
 *               type:
 *                 type: string
 *                 enum:
 *                   - church
 *                   - shrine
 *                   - monastery
 *                   - center
 *                   - other
 *                 example: "church"
 *                 description: "Loại địa điểm"
 *               patron_saint:
 *                 type: string
 *                 example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *                 description: "Thánh bổn mạng"
 *               cover_image:
 *                 type: string
 *                 format: binary
 *                 description: "Ảnh bìa (jpg, png, webp)"
 *               opening_hours:
 *                 type: string
 *                 example: '{"monday":"05:00-18:00","tuesday":"05:00-18:00","sunday":"05:00-20:00"}'
 *                 description: "Giờ mở cửa (JSON string)"
 *               contact_info:
 *                 type: string
 *                 example: '{"phone":"028-3822-0477","email":"contact@example.com","website":"https://example.com"}'
 *                 description: "Thông tin liên hệ (JSON string)"
 *     responses:
 *       201:
 *         description: Tạo địa điểm thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Không có quyền admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/sites:
 *   get:
 *     summary: Lấy danh sách địa điểm (Admin only)
 *     tags: [Sites]
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
 *         name: region
 *         schema:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *         description: Lọc theo vùng miền
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *         description: Lọc theo loại địa điểm
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
 *         description: Lọc theo trạng thái hoạt động (true = đang hoạt động, false = đã xóa)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc mã
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{id}:
 *   get:
 *     summary: Lấy chi tiết địa điểm (Admin only)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteResponse'
 *       404:
 *         description: Không tìm thấy địa điểm
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{id}:
 *   delete:
 *     summary: Xóa địa điểm (Soft Delete - Admin only)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     responses:
 *       200:
 *         description: Xóa địa điểm thành công
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
 *                   example: "Xóa địa điểm thành công"
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
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: Không tìm thấy địa điểm
 *       400:
 *         description: Địa điểm đã bị xóa
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{id}/restore:
 *   patch:
 *     summary: Khôi phục địa điểm đã xóa (Admin only)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     responses:
 *       200:
 *         description: Khôi phục địa điểm thành công
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
 *                   example: "Khôi phục địa điểm thành công"
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
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       404:
 *         description: Không tìm thấy địa điểm
 *       400:
 *         description: Địa điểm chưa bị xóa
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/sites/{id}:
 *   put:
 *     summary: Cập nhật địa điểm (Admin only)
 *     tags: [Sites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên địa điểm
 *               description:
 *                 type: string
 *               history:
 *                 type: string
 *               address:
 *                 type: string
 *               province:
 *                 type: string
 *               district:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               region:
 *                 type: string
 *                 enum: [Bac, Trung, Nam]
 *               type:
 *                 type: string
 *                 enum: [church, shrine, monastery, center, other]
 *               patron_saint:
 *                 type: string
 *               cover_image:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh bìa mới
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               opening_hours:
 *                 type: string
 *                 description: JSON string
 *               contact_info:
 *                 type: string
 *                 description: JSON string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteResponse'
 *       404:
 *         description: Không tìm thấy địa điểm
 *       409:
 *         description: Địa điểm đã tồn tại
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */
