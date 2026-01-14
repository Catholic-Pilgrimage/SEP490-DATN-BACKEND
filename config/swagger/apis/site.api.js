/**
 * @swagger
 * tags:
 *   - name: Admin Sites
 *     description: API quản lý địa điểm (Admin)
 *   - name: Manager Sites
 *     description: API quản lý địa điểm (Manager)
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
 *     summary: Chi tiết địa điểm (Admin only)
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
 *       404:
 *         description: Không tìm thấy
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
