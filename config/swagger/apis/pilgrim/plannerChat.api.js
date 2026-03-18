/**
 * @swagger
 * tags:
 *   name: Pilgrim - Planner Chat
 *   description: Chat giữa các thành viên trong kế hoạch hành hương
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PlannerMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         message_type:
 *           type: string
 *           enum: [text, image, system]
 *           description: Loại tin nhắn (system = tin hệ thống tự động)
 *         content:
 *           type: string
 *           description: Nội dung tin nhắn (nếu là text)
 *         image_url:
 *           type: string
 *           description: URL ảnh (nếu là image)
 *         sender:
 *           type: object
 *           nullable: true
 *           description: Null nếu message_type = system
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             avatar_url:
 *               type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     SendMessageRequest:
 *       type: object
 *       properties:
 *         message_type:
 *           type: string
 *           enum: [text, image]
 *           default: text
 *         content:
 *           type: string
 *           maxLength: 1000
 *           description: Nội dung tin nhắn (bắt buộc nếu message_type = text)
 *         image:
 *           type: string
 *           format: binary
 *           description: File ảnh (bắt buộc nếu message_type = image)
 *       description: Payload gửi tin nhắn (dạng text hoặc upload ảnh)
 */

/**
 * @swagger
 * /api/planners/{id}/messages:
 *   get:
 *     summary: Lấy danh sách tin nhắn chat
 *     description: Lấy tin nhắn trong planner chat. Chỉ owner và member mới có quyền truy cập.
 *     tags: [Pilgrim - Planner Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner
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
 *           default: 50
 *         description: Số tin nhắn mỗi trang
 *     responses:
 *       200:
 *         description: Lấy tin nhắn thành công
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
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlannerMessage'
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
 *       403:
 *         description: Không có quyền truy cập chat
 */

/**
 * @swagger
 * /api/planners/{id}/messages:
 *   post:
 *     summary: Gửi tin nhắn
 *     description: Gửi tin nhắn vào planner chat. Chỉ owner và member mới có quyền. Không thể gửi khi planner đã completed.
 *     tags: [Pilgrim - Planner Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       201:
 *         description: Gửi tin nhắn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PlannerMessage'
 *       400:
 *         description: Thiếu nội dung hoặc URL ảnh
 *       403:
 *         description: Không có quyền hoặc planner đã hoàn thành
 */

/**
 * @swagger
 * /api/planners/{id}/messages/{messageId}:
 *   delete:
 *     summary: Xóa tin nhắn
 *     description: Xóa tin nhắn. Chỉ người gửi hoặc owner mới có quyền xóa.
 *     tags: [Pilgrim - Planner Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của tin nhắn
 *     responses:
 *       200:
 *         description: Xóa tin nhắn thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Tin nhắn không tồn tại
 */
