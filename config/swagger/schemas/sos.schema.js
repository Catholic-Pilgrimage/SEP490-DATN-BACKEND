/**
 * @swagger
 * components:
 *   schemas:
 *     SOSRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: SOS request ID
 *         code:
 *           type: string
 *           description: Mã SOS duy nhất (format SOS{MMDD}{SEQ})
 *           example: "SOS0129001"
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID người hành hương gửi yêu cầu
 *         site_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID địa điểm cần hỗ trợ
 *         latitude:
 *           type: number
 *           format: double
 *           nullable: true
 *           description: Vĩ độ GPS
 *           example: 10.7783
 *         longitude:
 *           type: number
 *           format: double
 *           nullable: true
 *           description: Kinh độ GPS
 *           example: 106.6992
 *         message:
 *           type: string
 *           nullable: true
 *           description: Mô tả tình huống khẩn cấp
 *           example: "Tôi bị lạc tại khu vực nhà thờ chính"
 *         contact_phone:
 *           type: string
 *           nullable: true
 *           description: Số điện thoại liên hệ
 *           example: "0901234567"
 *         status:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *           description: |
 *             Trạng thái SOS:
 *             - **pending**: Đang chờ xử lý
 *             - **accepted**: Đã được hướng dẫn viên nhận
 *             - **resolved**: Đã giải quyết xong
 *             - **cancelled**: Đã hủy
 *           example: "pending"
 *         assigned_to:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: ID hướng dẫn viên được phân công
 *         assigned_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Thời điểm được phân công
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Ghi chú giải quyết
 *         resolved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Thời điểm giải quyết xong
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Thời điểm tạo yêu cầu
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Thời điểm cập nhật cuối
 *         site:
 *           type: object
 *           nullable: true
 *           description: Thông tin địa điểm
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               example: "Nhà thờ Đức Bà"
 *             address:
 *               type: string
 *               example: "01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM"
 *             province:
 *               type: string
 *               example: "TP. Hồ Chí Minh"
 *         pilgrim:
 *           type: object
 *           nullable: true
 *           description: Thông tin người hành hương
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *               example: "Nguyễn Văn A"
 *             phone:
 *               type: string
 *               example: "0901234567"
 *             avatar_url:
 *               type: string
 *               nullable: true
 *             email:
 *               type: string
 *               nullable: true
 *         assignedGuide:
 *           type: object
 *           nullable: true
 *           description: Thông tin hướng dẫn viên được phân công
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *               example: "Trần Thị B"
 *             phone:
 *               type: string
 *               example: "0912345678"
 *             avatar_url:
 *               type: string
 *               nullable: true
 *       example:
 *         id: "e5ff7548-dc76-4a55-8e22-734bf7a14f51"
 *         code: "SOS0129001"
 *         user_id: "4d53e540-e90d-486c-90a3-970fbd59dc9e"
 *         site_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         latitude: 10.7783
 *         longitude: 106.6992
 *         message: "Tôi bị lạc tại khu vực nhà thờ chính"
 *         contact_phone: "0901234567"
 *         status: "accepted"
 *         assigned_to: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *         assigned_at: "2025-01-29T10:15:00Z"
 *         notes: null
 *         resolved_at: null
 *         created_at: "2025-01-29T10:10:00Z"
 *         updated_at: "2025-01-29T10:15:00Z"
 *         site:
 *           id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *           name: "Nhà thờ Đức Bà"
 *           address: "01 Công xã Paris, Bến Nghé, Quận 1, TP.HCM"
 *           province: "TP. Hồ Chí Minh"
 *         pilgrim:
 *           id: "4d53e540-e90d-486c-90a3-970fbd59dc9e"
 *           full_name: "Nguyễn Văn A"
 *           phone: "0901234567"
 *           avatar_url: "https://example.com/avatar.jpg"
 *         assignedGuide:
 *           id: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *           full_name: "Trần Thị B"
 *           phone: "0912345678"
 *           avatar_url: "https://example.com/guide-avatar.jpg"
 *
 *     SOSCreateRequest:
 *       type: object
 *       required:
 *         - site_id
 *       properties:
 *         site_id:
 *           type: string
 *           format: uuid
 *           description: ID địa điểm cần hỗ trợ
 *         message:
 *           type: string
 *           description: Mô tả tình huống khẩn cấp
 *           example: "Tôi bị lạc tại khu vực nhà thờ chính"
 *         latitude:
 *           type: number
 *           format: double
 *           description: Vĩ độ GPS hiện tại
 *           example: 10.7783
 *         longitude:
 *           type: number
 *           format: double
 *           description: Kinh độ GPS hiện tại
 *           example: 106.6992
 *       example:
 *         site_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         message: "Tôi bị lạc tại khu vực nhà thờ chính"
 *         latitude: 10.7783
 *         longitude: 106.6992
 *
 *     SOSResolveRequest:
 *       type: object
 *       properties:
 *         notes:
 *           type: string
 *           description: Ghi chú giải quyết
 *           example: "Đã hỗ trợ người hành hương tìm lại đường về"
 *       example:
 *         notes: "Đã hỗ trợ người hành hương tìm lại đường về"
 *
 *     SOSStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Tổng số yêu cầu SOS
 *           example: 15
 *         pending:
 *           type: integer
 *           description: Số yêu cầu đang chờ xử lý
 *           example: 2
 *         accepted:
 *           type: integer
 *           description: Số yêu cầu đã được nhận
 *           example: 1
 *         resolved:
 *           type: integer
 *           description: Số yêu cầu đã giải quyết
 *           example: 10
 *         cancelled:
 *           type: integer
 *           description: Số yêu cầu đã hủy
 *           example: 2
 *         average_resolution_minutes:
 *           type: integer
 *           nullable: true
 *           description: Thời gian trung bình giải quyết SOS (phút)
 *           example: 12
 *       example:
 *         total: 15
 *         pending: 2
 *         accepted: 1
 *         resolved: 10
 *         cancelled: 2
 *         average_resolution_minutes: 12
 *
 *     SOSStatus:
 *       type: string
 *       enum: [pending, accepted, resolved, cancelled]
 *       description: |
 *         Trạng thái yêu cầu SOS:
 *         - **pending**: Đang chờ xử lý - Hướng dẫn viên đang trực sẽ nhận được thông báo
 *         - **accepted**: Đã được hướng dẫn viên nhận - Đang trong quá trình hỗ trợ
 *         - **resolved**: Đã giải quyết xong - Người hành hương đã được hỗ trợ thành công
 *         - **cancelled**: Đã hủy - Người hành hương tự hủy yêu cầu
 */

module.exports = {};
