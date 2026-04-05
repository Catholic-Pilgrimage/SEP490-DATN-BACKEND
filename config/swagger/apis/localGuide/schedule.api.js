/**
 * @swagger
 * tags:
 *   - name: Local Guide - Mass Schedules
 *     description: API quản lý lịch lễ
 */

/**
 * @swagger
 * /api/local-guide/schedules:
 *   post:
 *     summary: Tạo lịch lễ mới (Local Guide only)
 *     tags: [Local Guide - Mass Schedules]
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
 *                 example: [0, 6]
 *                 description: Các ngày trong tuần (0=CN, 1=T2, ..., 6=T7)
 *               time:
 *                 type: string
 *                 example: "06:00:00"
 *                 description: Giờ lễ (HH:MM:SS)
 *               note:
 *                 type: string
 *                 example: "Lễ sáng Chúa Nhật"
 *     responses:
 *       201:
 *         description: Tạo lịch lễ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Xem danh sách lịch lễ của tôi (Local Guide only)
 *     tags: [Local Guide - Mass Schedules]
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
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Lọc theo ngày trong tuần
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *                         format: time
 *                       note:
 *                         type: string
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       rejection_reason:
 *                         type: string
 *                         nullable: true
 *                       reviewed_by:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       reviewed_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       scheduleReviewer:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           full_name:
 *                             type: string
 *                           email:
 *                             type: string
 *                             format: email
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
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
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/local-guide/schedules/{id}:
 *   put:
 *     summary: Cập nhật lịch lễ (Local Guide only)
 *     description: Chỉ cập nhật được lịch pending hoặc rejected
 *     tags: [Local Guide - Mass Schedules]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days_of_week:
 *                 type: array
 *                 items:
 *                   type: integer
 *               time:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Không thể cập nhật lịch đã được duyệt
 *       404:
 *         description: Không tìm thấy lịch lễ
 *
 *   delete:
 *     summary: Xóa lịch lễ (Local Guide only)
 *     description: Chỉ xóa được lịch pending hoặc rejected
 *     tags: [Local Guide - Mass Schedules]
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
 *         description: Không thể xóa lịch đã được duyệt
 *       404:
 *         description: Không tìm thấy lịch lễ
 */

/**
 * @swagger
 * /api/local-guide/schedules/{id}/restore:
 *   patch:
 *     summary: Khôi phục lịch lễ đã xóa (Local Guide only)
 *     description: |
 *       Khôi phục lịch lễ đã bị soft delete (is_active: false).
 *       - Chỉ khôi phục được lịch pending hoặc rejected
 *       - Không thể khôi phục lịch đã approved
 *     tags: [Local Guide - Mass Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của lịch lễ cần khôi phục
 *     responses:
 *       200:
 *         description: Khôi phục thành công
 *       400:
 *         description: |
 *           - Không thể khôi phục lịch đã được duyệt
 *           - Lịch lễ đã được kích hoạt
 *       404:
 *         description: Không tìm thấy lịch lễ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */
