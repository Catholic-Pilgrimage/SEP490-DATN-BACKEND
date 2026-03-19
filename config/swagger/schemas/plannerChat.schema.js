/**
 * @swagger
 * components:
 *   schemas:
 *     SendMessageRequest:
 *       oneOf:
 *         - type: object
 *           required: [message_type, content]
 *           properties:
 *             message_type:
 *               type: string
 *               enum: [text]
 *             content:
 *               type: string
 *               maxLength: 1000
 *               description: Nội dung tin nhắn
 *         - type: object
 *           required: [message_type, image]
 *           properties:
 *             message_type:
 *               type: string
 *               enum: [image]
 *             image:
 *               type: string
 *               format: binary
 *               description: File ảnh tải lên
 *       discriminator:
 *         propertyName: message_type
 *       description: Payload gửi tin nhắn (dạng text hoặc upload ảnh)
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
 *           enum: [text, image, system]
 *           example: "text"
 *         content:
 *           type: string
 *           example: "Chúng ta nên đi vào lúc mấy giờ?"
 *         image_url:
 *           type: string
 *           format: uri
 *         user:
 *           type: object
 *           nullable: true
 *           description: Null nếu message_type = system
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
 */

module.exports = {};
