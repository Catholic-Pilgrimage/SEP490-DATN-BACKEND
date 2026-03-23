/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Quản lý báo cáo vi phạm
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Tạo báo cáo vi phạm mới
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_type
 *               - target_id
 *               - reason
 *             properties:
 *               target_type:
 *                 type: string
 *                 enum: [post, comment, journal]
 *                 description: Loại nội dung bị báo cáo
 *               target_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của nội dung bị báo cáo
 *               reason:
 *                 type: string
 *                 enum: [spam, inappropriate, harassment, other]
 *                 description: Lý do báo cáo
 *               description:
 *                 type: string
 *                 description: Mô tả chi tiết (tùy chọn)
 *     responses:
 *       201:
 *         description: Tạo báo cáo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy nội dung
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Lấy danh sách báo cáo (Admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, resolved, reject]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: target_type
 *         schema:
 *           type: string
 *           enum: [post, comment, journal]
 *         description: Lọc theo loại nội dung
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
 *         description: Danh sách báo cáo
 */

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     summary: Lấy các báo cáo của tôi
 *     tags: [Reports]
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách báo cáo của tôi
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Lấy chi tiết báo cáo
 *     tags: [Reports]
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
 *         description: Chi tiết báo cáo
 *       404:
 *         description: Không tìm thấy báo cáo
 */

/**
 * @swagger
 * /api/reports/{id}/resolve:
 *   patch:
 *     summary: Xử lý báo cáo (Admin only)
 *     tags: [Reports]
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
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [resolved, reject]
 *                 description: Hành động xử lý
 *               note:
 *                 type: string
 *                 description: Ghi chú của admin
 *     responses:
 *       200:
 *         description: Xử lý báo cáo thành công
 *       404:
 *         description: Không tìm thấy báo cáo
 */

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Xóa báo cáo của mình
 *     tags: [Reports]
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
 *         description: Xóa báo cáo thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Không tìm thấy báo cáo
 */

module.exports = {};
