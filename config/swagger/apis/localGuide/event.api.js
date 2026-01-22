/**
 * @swagger
 * tags:
 *   - name: Local Guide - Events
 *     description: API quản lý sự kiện
 */

/**
 * @swagger
 * /api/local-guide/events:
 *   post:
 *     summary: Tạo sự kiện mới (Local Guide only)
 *     tags: [Local Guide - Events]
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
 *                 example: "Lễ Giáng Sinh 2026"
 *               description:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-24"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-25"
 *               start_time:
 *                 type: string
 *                 example: "18:00"
 *               end_time:
 *                 type: string
 *                 example: "22:00"
 *               location:
 *                 type: string
 *                 example: "Sân nhà thờ"
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Banner sự kiện
 *     responses:
 *       201:
 *         description: Tạo sự kiện thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *
 *   get:
 *     summary: Xem danh sách sự kiện của tôi (Local Guide only)
 *     tags: [Local Guide - Events]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/local-guide/events/{id}:
 *   put:
 *     summary: Cập nhật sự kiện (Local Guide only)
 *     description: Chỉ cập nhật được sự kiện pending hoặc rejected
 *     tags: [Local Guide - Events]
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
 *               description:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               location:
 *                 type: string
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể cập nhật sự kiện đã được duyệt
 *       404:
 *         description: Không tìm thấy sự kiện
 *
 *   delete:
 *     summary: Xóa sự kiện (Local Guide only)
 *     description: Chỉ xóa được sự kiện pending hoặc rejected
 *     tags: [Local Guide - Events]
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
 *         description: Không thể xóa sự kiện đã được duyệt
 *       404:
 *         description: Không tìm thấy sự kiện
 */
