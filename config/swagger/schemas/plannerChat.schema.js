/**
 * @swagger
 * components:
 *   schemas:
 *     SendMessageRequest:
 *       type: object
 *       properties:
 *         message_type:
 *           type: string
 *           enum: [text, image]
 *           default: text
 *           example: "text"
 *           description: "Loại tin nhắn"
 *         content:
 *           type: string
 *           maxLength: 1000
 *           example: "Chúng ta nên đi vào lúc mấy giờ?"
 *           description: "Nội dung tin nhắn (bắt buộc với text, tùy chọn với image)"
 *         image_url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/xxx/image/upload/v123/planner_chat/abc.jpg"
 *           description: "URL ảnh (bắt buộc với image type)"
 *
 *     PlannerMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         planner_id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         message_type:
 *           type: string
 *           enum: [text, image]
 *           example: "text"
 *         content:
 *           type: string
 *           example: "Chúng ta nên đi vào lúc mấy giờ?"
 *         image_url:
 *           type: string
 *           format: uri
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *               example: "Nguyễn Văn A"
 *             avatar_url:
 *               type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     MessageListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy tin nhắn thành công"
 *         data:
 *           type: object
 *           properties:
 *             messages:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlannerMessage'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 total:
 *                   type: integer
 *                   example: 125
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Gửi tin nhắn thành công"
 *         data:
 *           $ref: '#/components/schemas/PlannerMessage'
 *
 *     UploadImageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Upload ảnh thành công"
 *         data:
 *           type: object
 *           properties:
 *             image_url:
 *               type: string
 *               format: uri
 *               example: "https://res.cloudinary.com/xxx/image/upload/v123/planner_chat/abc.jpg"
 */

module.exports = {};
