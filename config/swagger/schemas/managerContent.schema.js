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
 *         code:
 *           type: string
 *           example: "MDL0228001"
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
 *           example: "approved"
 *           description: Trạng thái duyệt của media (3D model/image/video)
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *           example: null
 *           description: Lý do từ chối media
 *         is_active:
 *           type: boolean
 *           example: true
 *           description: Trạng thái active (false = đã ẩn/xóa mềm)
 *         reviewed_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         audio_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://res.cloudinary.com/xxx/video/upload/v1234/narration.mp3"
 *           description: URL file audio thuyết minh (chỉ cho model_3d)
 *         narration_text:
 *           type: string
 *           nullable: true
 *           example: "Kính chào quý khách hành hương..."
 *           description: Nội dung text thuyết minh (dùng cho TTS)
 *         narrative_status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           nullable: true
 *           example: "pending"
 *           description: |
 *             Trạng thái duyệt thuyết minh (riêng biệt với status của media):
 *             - null: Chưa có thuyết minh
 *             - pending: Đang chờ Manager duyệt
 *             - approved: Đã được duyệt
 *             - rejected: Bị từ chối
 *         narrative_rejection_reason:
 *           type: string
 *           nullable: true
 *           example: null
 *           description: Lý do từ chối thuyết minh (nếu narrative_status = rejected)
 *         narrative_reviewed_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         narrative_reviewed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
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
 *         mediaReviewer:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *         narrativeReviewer:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *               format: email
 *         created_by:
 *           type: string
 *           format: uuid
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
