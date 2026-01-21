/**
 * @swagger
 * tags:
 *   name: Manager Local Guides
 *   description: API quản lý Local Guide (Manager only)
 */

/**
 * @swagger
 * /api/manager/local-guides:
 *   post:
 *     summary: Tạo Local Guide mới (Manager only)
 *     description: Tạo tài khoản Local Guide cho site của Manager. Password sẽ được auto-generate và gửi qua email.
 *     tags: [Manager Local Guides]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - full_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "localguide1@gmail.com"
 *               full_name:
 *                 type: string
 *                 example: "Nguyen Van B"
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *     responses:
 *       201:
 *         description: Tạo Local Guide thành công
 *       400:
 *         description: Manager chưa có site
 *       403:
 *         description: Chỉ Manager mới có quyền
 *       409:
 *         description: Email đã tồn tại
 *   get:
 *     summary: Danh sách Local Guide (Manager only)
 *     description: Lấy danh sách Local Guide với filter và pagination
 *     tags: [Manager Local Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, banned]
 *           example: "active"
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "nguyen"
 *         description: Tìm kiếm theo tên, email hoặc số điện thoại
 *     responses:
 *       200:
 *         description: Thành công
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           email:
 *                             type: string
 *                           full_name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [active, banned]
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: Manager chưa có site
 */

/**
 * @swagger
 * /api/manager/local-guides/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái Local Guide (Manager only)
 *     description: Block hoặc Unblock Local Guide (chuyển status giữa active và banned)
 *     tags: [Manager Local Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của Local Guide
 *         example: "550e8400-e29b-41d4-a716-446655440000"
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
 *                 enum: [active, banned]
 *                 description: "active = unblock, banned = block"
 *                 example: "banned"
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [active, banned]
 *       400:
 *         description: Invalid status hoặc đã ở trạng thái đó rồi
 *       404:
 *         description: Không tìm thấy Local Guide
 */

/**
 * @swagger
 * /api/manager/local-guides/shift-submissions:
 *   get:
 *     summary: Xem danh sách submissions lịch làm việc (Manager only)
 *     description: Manager xem tất cả submissions của các Local Guide trong site.
 *     tags: [Manager Local Guides]
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
 *           default: 20
 *       - in: query
 *         name: guide_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo Local Guide
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: week_start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc theo tuần
 *     responses:
 *       200:
 *         description: Thành công
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
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GuideShiftSubmission'
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền Manager
 */

/**
 * @swagger
 * /api/manager/local-guides/shift-submissions/{id}:
 *   get:
 *     summary: Xem chi tiết submission (Manager only)
 *     description: |
 *       Manager xem chi tiết submission, bao gồm thông tin thay đổi (diff) nếu là update.
 *       Response sẽ có thêm field `changes` chứa danh sách các thay đổi so với lịch cũ.
 *     tags: [Manager Local Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của submission
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SubmissionWithChanges'
 *       404:
 *         description: Không tìm thấy submission
 */

/**
 * @swagger
 * /api/manager/local-guides/shift-submissions/{id}/status:
 *   patch:
 *     summary: Duyệt/Từ chối submission (Manager only)
 *     description: |
 *       Manager approve hoặc reject submission lịch làm việc.
 *       Khi approved, lịch cũ (nếu có) sẽ bị deactivate.
 *     tags: [Manager Local Guides]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của submission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmissionStatusRequest'
 *           examples:
 *             approve:
 *               summary: Duyệt submission
 *               value:
 *                 status: "approved"
 *             reject:
 *               summary: Từ chối submission
 *               value:
 *                 status: "rejected"
 *                 rejection_reason: "Lịch trực không phù hợp với nhu cầu site"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
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
 *                 data:
 *                   $ref: '#/components/schemas/GuideShiftSubmission'
 *       400:
 *         description: |
 *           - Submission đã ở trạng thái đó
 *           - Thiếu rejection_reason khi reject
 *       404:
 *         description: Không tìm thấy submission
 */

