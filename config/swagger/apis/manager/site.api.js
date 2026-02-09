/**
 * @swagger
 * tags:
 *   name: Manager - Sites
 *   description: API quản lí địa điểm hành hương (Manager)
 */
// MANAGER SITE ROUTES
// ============================================

/**
 * @swagger
 * /api/manager/sites:
 *   post:
 *     summary: Tạo địa điểm mới (Manager only - max 1 site)
 *     description: Manager chỉ được tạo 1 site duy nhất, site sẽ được tự động phê duyệt.
 *     tags: [Manager - Sites]
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
 *     tags: [Manager - Sites]
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
 *     tags: [Manager - Sites]
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

module.exports = {};
