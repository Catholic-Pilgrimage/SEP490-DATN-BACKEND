/**
 * @swagger
 * tags:
 *   name: Verification
 *   description: API quản lý yêu cầu xác minh Manager
 */

/**
 * @swagger
 * /api/verification/guest-request:
 *   post:
 *     summary: Gửi yêu cầu xác minh (Guest - không cần đăng nhập)
 *     tags: [Verification]
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
 *     tags: [Verification]
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
 *     tags: [Verification]
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
 * /api/admin/verification-requests:
 *   get:
 *     summary: Danh sách yêu cầu xác minh (Admin only)
 *     tags: [Verification]
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
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo code hoặc tên site
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/verification-requests/{id}:
 *   get:
 *     summary: Chi tiết yêu cầu xác minh (Admin only)
 *     tags: [Verification]
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
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy yêu cầu
 *   patch:
 *     summary: Cập nhật trạng thái yêu cầu - Approve/Reject (Admin only)
 *     tags: [Verification]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: Trạng thái mới
 *               rejection_reason:
 *                 type: string
 *                 minLength: 10
 *                 description: Bắt buộc khi status = rejected
 *                 example: "Giấy tờ không hợp lệ, vui lòng gửi lại"
 *           examples:
 *             approve:
 *               summary: Phê duyệt
 *               value:
 *                 status: "approved"
 *             reject:
 *               summary: Từ chối
 *               value:
 *                 status: "rejected"
 *                 rejection_reason: "Giấy tờ không hợp lệ, vui lòng gửi lại"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc yêu cầu không pending
 *       404:
 *         description: Không tìm thấy yêu cầu
 */
