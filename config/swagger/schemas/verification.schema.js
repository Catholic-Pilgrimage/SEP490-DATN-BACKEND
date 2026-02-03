/**
 * @swagger
 * components:
 *   schemas:
 *     VerificationRequestInput:
 *       type: object
 *       required:
 *         - site_name
 *         - site_province
 *       properties:
 *         site_name:
 *           type: string
 *           description: Tên địa điểm muốn quản lý
 *           example: "Nhà Thờ Đức Bà"
 *         site_address:
 *           type: string
 *           description: Địa chỉ
 *           example: "1 Công xã Paris, Bến Nghé, Quận 1"
 *         site_province:
 *           type: string
 *           description: Tỉnh/Thành phố
 *           example: "TP. Hồ Chí Minh"
 *         site_type:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *           description: Loại địa điểm
 *         site_region:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *           description: Vùng miền
 *         certificate:
 *           type: string
 *           format: binary
 *           description: Giấy tờ chứng minh (upload file)
 *         introduction:
 *           type: string
 *           description: Giới thiệu bản thân
 *           example: "Tôi là người phụ trách nhà thờ..."
 *
 *     VerificationRequestResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "VR01131"
 *         site_name:
 *           type: string
 *         site_address:
 *           type: string
 *         site_province:
 *           type: string
 *         site_type:
 *           type: string
 *         site_region:
 *           type: string
 *         certificate_url:
 *           type: string
 *         introduction:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejection_reason:
 *           type: string
 *         verified_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         applicant:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *             avatar_url:
 *               type: string
 *
 *     TransitionRequestInput:
 *       type: object
 *       required:
 *         - existing_site_id
 *         - transition_reason
 *       properties:
 *         existing_site_id:
 *           type: string
 *           format: uuid
 *           description: ID của Site muốn xin quản lý
 *         transition_reason:
 *           type: string
 *           description: Lý do xin thay thế Manager hiện tại
 *           example: "Manager hiện tại không còn hoạt động..."
 *         applicant_email:
 *           type: string
 *           format: email
 *           description: Email (bắt buộc cho guest)
 *         applicant_name:
 *           type: string
 *           description: Họ tên (bắt buộc cho guest)
 *         applicant_phone:
 *           type: string
 *           description: Số điện thoại
 *         certificate:
 *           type: string
 *           format: binary
 *           description: Giấy tờ chứng minh
 *         introduction:
 *           type: string
 *           description: Giới thiệu bản thân
 *
 *     TransitionRequestResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "VR01285"
 *         existing_site_id:
 *           type: string
 *           format: uuid
 *         transition_reason:
 *           type: string
 *         site:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             province:
 *               type: string
 *         old_manager:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         created_at:
 *           type: string
 *           format: date-time
 */
