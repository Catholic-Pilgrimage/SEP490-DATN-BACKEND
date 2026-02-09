/**
 * @swagger
 * tags:
 *   name: Pilgrim - Verification
 *   description: API quản lý yêu cầu xác minh Manager
 */

/**
 * @swagger
 * /api/verification/guest-request:
 *   post:
 *     summary: Gửi yêu cầu xác minh (Guest - không cần đăng nhập)
 *     tags: [Pilgrim - Verification]
 *     description: |
 *       Cho phép người chưa có tài khoản gửi yêu cầu trở thành Manager.
 *       Khi Admin approve, hệ thống sẽ tự động:
 *       - Tạo tài khoản Manager
 *       - Tạo Site
 *       - Gửi email với thông tin đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - applicant_email
 *               - applicant_name
 *               - site_name
 *               - site_province
 *             properties:
 *               applicant_email:
 *                 type: string
 *                 format: email
 *                 description: Email người đăng ký
 *                 example: manager@example.com
 *               applicant_name:
 *                 type: string
 *                 description: Họ tên người đăng ký
 *                 example: Nguyễn Văn A
 *               applicant_phone:
 *                 type: string
 *                 description: Số điện thoại (10-11 số)
 *                 example: "0901234567"
 *               site_name:
 *                 type: string
 *                 description: Tên địa điểm
 *                 example: Nhà thờ Đức Bà Sài Gòn
 *               site_address:
 *                 type: string
 *                 example: 01 Công xã Paris, Bến Nghé, Quận 1
 *               site_province:
 *                 type: string
 *                 description: Tỉnh/Thành phố
 *                 example: TP. Hồ Chí Minh
 *               site_type:
 *                 type: string
 *                 enum: [church, shrine, monastery, center, other]
 *                 default: church
 *               site_region:
 *                 type: string
 *                 enum: [Bac, Trung, Nam]
 *                 default: Nam
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Giấy tờ chứng minh (PDF, JPG, PNG)
 *               introduction:
 *                 type: string
 *                 description: Giới thiệu về bản thân và địa điểm
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Gửi yêu cầu xác minh thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                       example: VR01271
 *                     applicant_email:
 *                       type: string
 *                     applicant_name:
 *                       type: string
 *                     site_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: Email đã được đăng ký hoặc đã có yêu cầu pending
 */

/**
 * @swagger
 * /api/verification-requests:
 *   post:
 *     summary: Gửi yêu cầu xác minh (Pilgrim only)
 *     tags: [Pilgrim - Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - site_name
 *               - site_province
 *             properties:
 *               site_name:
 *                 type: string
 *                 description: Tên địa điểm
 *               site_address:
 *                 type: string
 *               site_province:
 *                 type: string
 *                 description: Tỉnh/Thành phố
 *               site_type:
 *                 type: string
 *                 enum: [church, shrine, monastery, center, other]
 *               site_region:
 *                 type: string
 *                 enum: [Bac, Trung, Nam]
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Giấy tờ chứng minh (PDF, JPG, PNG)
 *               introduction:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Chỉ Pilgrim mới được gửi yêu cầu
 *       409:
 *         description: Đã có yêu cầu đang chờ xử lý
 */

/**
 * @swagger
 * /api/verification-requests/me:
 *   get:
 *     summary: Xem yêu cầu xác minh của tôi (Pilgrim only)
 *     tags: [Pilgrim - Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationRequestResponse'
 *       404:
 *         description: Chưa có yêu cầu nào
 */

/**
 * @swagger
 * /api/verification/transition:
 *   post:
 *     summary: Gửi yêu cầu thay thế Manager (Guest - Manager Transition)
 *     description: |
 *       Cho phép người chưa có tài khoản hoặc Pilgrim gửi yêu cầu thay thế Manager của một địa điểm có sẵn.
 *       Khi Admin approve:
 *       - Manager cũ bị demote về Pilgrim
 *       - Local Guides được đánh dấu "inherited"
 *       - Người xin trở thành Manager mới của site
 *     tags: [Pilgrim - Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - existing_site_id
 *               - transition_reason
 *             properties:
 *               applicant_email:
 *                 type: string
 *                 format: email
 *                 description: Email người đăng ký (bắt buộc nếu là guest)
 *                 example: newmanager@example.com
 *               applicant_name:
 *                 type: string
 *                 description: Họ tên người đăng ký (bắt buộc nếu là guest)
 *                 example: Nguyễn Văn B
 *               applicant_phone:
 *                 type: string
 *                 description: Số điện thoại
 *                 example: "0901234567"
 *               existing_site_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của Site muốn xin quản lý
 *               transition_reason:
 *                 type: string
 *                 description: Lý do xin thay thế Manager hiện tại
 *                 example: "Manager hiện tại không còn hoạt động..."
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Giấy tờ chứng minh (PDF, JPG, PNG)
 *               introduction:
 *                 type: string
 *                 description: Giới thiệu về bản thân
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Gửi yêu cầu thay thế quản lý thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                       example: VR01285
 *                     existing_site_id:
 *                       type: string
 *                       format: uuid
 *                     transition_reason:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc site không có manager
 *       409:
 *         description: Đã có yêu cầu pending hoặc site đã có yêu cầu transition pending
 */

/**
 * @swagger
 * /api/verification-requests/transition:
 *   post:
 *     summary: Gửi yêu cầu thay thế Manager (Pilgrim only - Manager Transition)
 *     description: |
 *       Cho phép Pilgrim gửi yêu cầu thay thế Manager của một địa điểm có sẵn.
 *       Thông tin người dùng sẽ lấy từ token đăng nhập.
 *     tags: [Pilgrim - Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - existing_site_id
 *               - transition_reason
 *             properties:
 *               existing_site_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của Site muốn xin quản lý
 *               transition_reason:
 *                 type: string
 *                 description: Lý do xin thay thế Manager hiện tại
 *               certificate:
 *                 type: string
 *                 format: binary
 *                 description: Giấy tờ chứng minh (PDF, JPG, PNG)
 *               introduction:
 *                 type: string
 *                 description: Giới thiệu về bản thân
 *     responses:
 *       201:
 *         description: Gửi yêu cầu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Chỉ Pilgrim mới được gửi yêu cầu
 *       409:
 *         description: Đã có yêu cầu pending
 */

module.exports = {};
