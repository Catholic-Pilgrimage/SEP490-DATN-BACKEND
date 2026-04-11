/**
 * @swagger
 * tags:
 *   - name: Local Guide - Shift Submissions
 *     description: API quản lý đăng ký lịch làm việc
 */

/**
 * @swagger
 * /api/local-guide/shift-submissions:
 *   post:
 *     summary: Tạo đăng ký lịch làm việc (Local Guide only)
 *     description: |
 *       Local Guide đăng ký lịch làm việc cho một tuần cụ thể.
 *       
 *       **Flow:**
 *       1. Tạo submission mới với `week_start_date` và `shifts`
 *       2. Submission có status `pending`, chờ Manager duyệt
 *       3. Nếu muốn sửa lịch đã được approved, phải gửi submission mới với `previous_submission_id`
 *       
 *       **Validation rules:**
 *       - Mỗi ca làm việc: tối thiểu 2 giờ, tối đa 8 giờ
 *       - Mỗi ngày: tối thiểu 1 ca, tối đa 3 ca
 *       - Mỗi tuần: tối thiểu 3 ca, tối đa 21 ca
 *       - Giữa các ca trong cùng ngày phải có ít nhất 30 phút nghỉ
 *       - Không được trùng ca trong cùng submission
 *       - Phải nằm trong giờ mở cửa của site (nếu có)
 *       - Không được trùng với ca của Local Guide khác
 *     tags: [Local Guide - Shift Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubmissionRequest'
 *           example:
 *             week_start_date: "2026-01-27"
 *             shifts:
 *               - day_of_week: 1
 *                 start_time: "08:00"
 *                 end_time: "12:00"
 *               - day_of_week: 1
 *                 start_time: "14:00"
 *                 end_time: "18:00"
 *               - day_of_week: 3
 *                 start_time: "08:00"
 *                 end_time: "16:00"
 *     responses:
 *       201:
 *         description: Tạo submission thành công
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
 *                   example: "Đăng ký lịch làm việc thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     submission:
 *                       $ref: '#/components/schemas/GuideShiftSubmission'
 *                     shifts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GuideShift'
 *                     errors:
 *                       type: array
 *                       nullable: true
 *       400:
 *         description: |
 *           - Đã có submission pending cho tuần này
 *           - Không có shifts hợp lệ
 *           - Change reason required (khi update)
 *           - Vi phạm ràng buộc: số ca/ngày, thời lượng ca, thời gian nghỉ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       409:
 *         description: Trùng lịch với Local Guide khác
 *
 *   get:
 *     summary: Xem danh sách submissions của tôi (Local Guide only)
 *     description: Lấy danh sách submissions lịch làm việc của Local Guide
 *     tags: [Local Guide - Shift Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Lọc theo tuần (ngày đầu tuần)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GuideShiftSubmission'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/shift-submissions/{id}:
 *   get:
 *     summary: Xem chi tiết submission (Local Guide only)
 *     description: Lấy thông tin chi tiết một submission
 *     tags: [Local Guide - Shift Submissions]
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
 *                   $ref: '#/components/schemas/GuideShiftSubmission'
 *       404:
 *         description: Không tìm thấy submission
 *
 *   put:
 *     summary: Cập nhật submission (Local Guide only)
 *     description: |
 *       Cập nhật toàn bộ danh sách shifts trong submission.
 *       Chỉ có thể sửa submission có status = 'pending' hoặc 'rejected'.
 *       Nếu submission bị rejected, sẽ tự động reset về pending sau khi update.
 *     tags: [Local Guide - Shift Submissions]
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
 *             $ref: '#/components/schemas/UpdateSubmissionRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Submission không tìm thấy hoặc đã được approved
 *
 *   delete:
 *     summary: Xóa submission pending (Local Guide only)
 *     description: Xóa submission đang pending. Không thể xóa submission đã approved/rejected.
 *     tags: [Local Guide - Shift Submissions]
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
 *         description: Xóa thành công
 *       404:
 *         description: Submission không tìm thấy hoặc không phải pending
 */

/**
 * @swagger
 * /api/local-guide/site-schedule:
 *   get:
 *     summary: Xem lịch toàn site (calendar view)
 *     description: |
 *       Lấy lịch làm việc của tất cả Local Guide trong site cho tuần cụ thể.
 *       Dùng để hiển thị calendar và biết slot nào đã có người đăng ký.
 *     tags: [Local Guide - Shift Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: week_start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày đầu tuần (Thứ 2)
 *         example: "2026-01-27"
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
 *                     week_start_date:
 *                       type: string
 *                       format: date
 *                     site_id:
 *                       type: string
 *                       format: uuid
 *                     site_name:
 *                       type: string
 *                     opening_hours:
 *                       type: object
 *                     daily_bounds:
 *                       type: object
 *                       description: |
 *                         Khung giờ hoạt động linh hoạt theo ngày (0=CN, 1-6=T2-T7).
 *                         Mỗi ngày chứa một mảng windows (các khung giờ hợp lệ) và events.
 *                         Gaps giữa các windows là khoảng thời gian site đóng cửa.
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           windows:
 *                             type: array
 *                             description: Các khung giờ hợp lệ để đăng ký ca trực
 *                             items:
 *                               type: object
 *                               properties:
 *                                 open:
 *                                   type: string
 *                                   example: "08:00:00"
 *                                 close:
 *                                   type: string
 *                                   example: "17:00:00"
 *                           events:
 *                             type: array
 *                             description: Danh sách events trong ngày đó
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 start_time:
 *                                   type: string
 *                                   nullable: true
 *                                 end_time:
 *                                   type: string
 *                                   nullable: true
 *                                 all_day:
 *                                   type: boolean
 *                     schedule:
 *                       type: object
 *                       description: Lịch theo ngày (0-6)
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             shift_id:
 *                               type: string
 *                               format: uuid
 *                             submission_id:
 *                               type: string
 *                               format: uuid
 *                             start_time:
 *                               type: string
 *                             end_time:
 *                               type: string
 *                             guide_name:
 *                               type: string
 *                             status:
 *                               type: string
 *                               enum: [pending, approved]
 *                             is_mine:
 *                               type: boolean
 *       400:
 *         description: week_start_date không được để trống
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

module.exports = {};
