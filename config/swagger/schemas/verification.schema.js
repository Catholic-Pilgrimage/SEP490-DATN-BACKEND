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
 */
