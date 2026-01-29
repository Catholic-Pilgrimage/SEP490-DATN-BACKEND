/**
 * @swagger
 * tags:
 *   - name: SOS - Pilgrim
 *     description: API yêu cầu SOS khẩn cấp cho Người hành hương
 *   - name: SOS - LocalGuide
 *     description: API xử lý SOS cho Hướng dẫn viên
 *   - name: SOS - Manager
 *     description: API quản lý SOS cho Quản lý
 *   - name: SOS - Admin
 *     description: API quản lý SOS toàn hệ thống cho Admin
 */

// ===================== PILGRIM APIs =====================

/**
 * @swagger
 * /api/sos:
 *   post:
 *     summary: Tạo yêu cầu SOS
 *     description: Người hành hương gửi yêu cầu SOS khẩn cấp. Hướng dẫn viên đang trực sẽ nhận thông báo ngay lập tức.
 *     tags: [SOS - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SOSCreateRequest'
 *     responses:
 *       201:
 *         description: Tạo yêu cầu SOS thành công
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
 *                   example: "Tạo yêu cầu SOS thành công"
 *                 data:
 *                   $ref: '#/components/schemas/SOSRequest'
 *       400:
 *         description: Yêu cầu không hợp lệ (đã có SOS đang chờ xử lý, v.v.)
 */

/**
 * @swagger
 * /api/sos:
 *   get:
 *     summary: Lấy danh sách SOS của tôi
 *     description: Lấy danh sách các yêu cầu SOS do người dùng hiện tại tạo
 *     tags: [SOS - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: List of SOS requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sosRequests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SOSRequest'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/sos/{id}:
 *   get:
 *     summary: Xem chi tiết SOS
 *     description: Xem chi tiết một yêu cầu SOS cụ thể
 *     tags: [SOS - Pilgrim]
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
 *         description: Chi tiết yêu cầu SOS
 *       404:
 *         description: Không tìm thấy yêu cầu SOS
 *   delete:
 *     summary: Hủy yêu cầu SOS
 *     description: Hủy yêu cầu SOS đang chờ xử lý
 *     tags: [SOS - Pilgrim]
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
 *         description: Hủy yêu cầu SOS thành công
 *       400:
 *         description: Không thể hủy (không ở trạng thái chờ xử lý)
 */

// ===================== LOCAL GUIDE APIs =====================

/**
 * @swagger
 * /api/sos/site/list:
 *   get:
 *     summary: Xem danh sách SOS tại địa điểm của tôi
 *     description: Hướng dẫn viên xem các yêu cầu SOS tại địa điểm được phân công
 *     tags: [SOS - LocalGuide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *       - in: query
 *         name: show_all
 *         schema:
 *           type: boolean
 *         description: Show all statuses (default shows only pending/accepted)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: List of SOS requests
 */

/**
 * @swagger
 * /api/sos/site/{id}:
 *   get:
 *     summary: Xem chi tiết SOS
 *     description: Hướng dẫn viên xem chi tiết yêu cầu SOS
 *     tags: [SOS - LocalGuide]
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
 *         description: Chi tiết yêu cầu SOS với thông tin liên hệ người hành hương
 */

/**
 * @swagger
 * /api/sos/{id}/assign:
 *   patch:
 *     summary: Nhận xử lý SOS
 *     description: Hướng dẫn viên nhận/phân công bản thân xử lý yêu cầu SOS
 *     tags: [SOS - LocalGuide]
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
 *         description: Nhận SOS thành công, người hành hương đã được thông báo
 *       400:
 *         description: SOS đã được nhận hoặc không ở trạng thái chờ xử lý
 */

/**
 * @swagger
 * /api/sos/{id}/resolve:
 *   patch:
 *     summary: Giải quyết SOS
 *     description: Hướng dẫn viên đánh dấu SOS đã giải quyết sau khi hỗ trợ người hành hương
 *     tags: [SOS - LocalGuide]
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SOSResolveRequest'
 *     responses:
 *       200:
 *         description: Giải quyết SOS thành công, người hành hương đã được thông báo
 */

// ===================== MANAGER APIs =====================

/**
 * @swagger
 * /api/sos/manager/list:
 *   get:
 *     summary: Xem tất cả SOS tại địa điểm
 *     description: Quản lý xem tất cả yêu cầu SOS tại địa điểm của họ
 *     tags: [SOS - Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: List of SOS requests
 */

/**
 * @swagger
 * /api/sos/manager/stats:
 *   get:
 *     summary: Xem thống kê SOS
 *     description: Quản lý xem thống kê SOS cho địa điểm của họ
 *     tags: [SOS - Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thống kê SOS
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SOSStats'
 */

// ===================== ADMIN APIs =====================

/**
 * @swagger
 * /api/sos/admin/list:
 *   get:
 *     summary: Xem tất cả SOS toàn hệ thống
 *     description: Admin xem tất cả yêu cầu SOS từ tất cả các địa điểm
 *     tags: [SOS - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, resolved, cancelled]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo địa điểm
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách SOS toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     sosRequests:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SOSRequest'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Không có quyền truy cập (chỉ Admin)
 */

/**
 * @swagger
 * /api/sos/admin/stats:
 *   get:
 *     summary: Xem thống kê SOS toàn hệ thống
 *     description: Admin xem thống kê SOS từ tất cả các địa điểm với breakdown theo site
 *     tags: [SOS - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo địa điểm (tùy chọn)
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày
 *     responses:
 *       200:
 *         description: Thống kê SOS toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     pending:
 *                       type: integer
 *                       example: 5
 *                     accepted:
 *                       type: integer
 *                       example: 3
 *                     resolved:
 *                       type: integer
 *                       example: 40
 *                     cancelled:
 *                       type: integer
 *                       example: 2
 *                     by_site:
 *                       type: array
 *                       description: Thống kê theo từng địa điểm
 *                       items:
 *                         type: object
 *                         properties:
 *                           site_id:
 *                             type: string
 *                             format: uuid
 *                           site_name:
 *                             type: string
 *                             example: "Nhà thờ Đức Bà"
 *                           count:
 *                             type: integer
 *                             example: 15
 *                     average_resolution_minutes:
 *                       type: integer
 *                       nullable: true
 *                       description: Thời gian trung bình giải quyết SOS (phút)
 *                       example: 12
 *       403:
 *         description: Không có quyền truy cập (chỉ Admin)
 */

module.exports = {};
