/**
 * @swagger
 * components:
 *   schemas:
 *     CreateLocalGuideRequest:
 *       type: object
 *       required:
 *         - email
 *         - full_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "localguide@example.com"
 *           description: Email của Local Guide (dùng để đăng nhập)
 *         full_name:
 *           type: string
 *           example: "Nguyễn Văn A"
 *           description: Họ tên đầy đủ (2-100 ký tự)
 *         phone:
 *           type: string
 *           example: "0901234567"
 *           description: Số điện thoại (10-11 số, không bắt buộc)
 *
 *     LocalGuideResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tạo Local Guide thành công"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *             email:
 *               type: string
 *               example: "localguide@example.com"
 *             full_name:
 *               type: string
 *               example: "Nguyễn Văn A"
 *             phone:
 *               type: string
 *               example: "0901234567"
 *             role:
 *               type: string
 *               example: "local_guide"
 *             status:
 *               type: string
 *               example: "active"
 *             site:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 code:
 *                   type: string
 *                   example: "CHNAM001"
 *                 name:
 *                   type: string
 *                   example: "Nhà thờ Đức Bà Sài Gòn"
 *             created_at:
 *               type: string
 *               format: date-time
 *
 *     LocalGuideListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách Local Guide thành công"
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               email:
 *                 type: string
 *                 example: "localguide@example.com"
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               status:
 *                 type: string
 *                 enum: [active, banned]
 *                 example: "active"
 *               created_at:
 *                 type: string
 *                 format: date-time
 *
 *     DeleteLocalGuideResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Xóa Local Guide thành công"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               example: "localguide@example.com"
 *             status:
 *               type: string
 *               example: "banned"
 */
