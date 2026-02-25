/**
 * @swagger
 * components:
 *   schemas:
 *     ManagerMediaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách media thành công"
 *         data:
 *           type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SiteMediaWithCreator'
 *             pagination:
 *               $ref: '#/components/schemas/PaginationInfo'
 *
 *     SiteMediaWithCreator:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         site_id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/xxx/image/upload/v1234/model.glb"
 *         type:
 *           type: string
 *           enum: [image, video, model_3d]
 *           example: "model_3d"
 *         caption:
 *           type: string
 *           example: "Toàn cảnh nhà thờ"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: "pending"
 *         creator:
 *           type: object
 *           description: Thông tin người upload (Local Guide)
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *               example: "Nguyễn Văn A"
 *             email:
 *               type: string
 *               format: email
 *               example: "localguide@example.com"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     UpdateMediaStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected]
 *           description: |
 *             - `approved`: Duyệt media (hiển thị cho public)
 *             - `rejected`: Từ chối media
 *           example: "approved"
 *
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalItems:
 *           type: integer
 *           example: 25
 *         totalPages:
 *           type: integer
 *           example: 3
 */

module.exports = {};
