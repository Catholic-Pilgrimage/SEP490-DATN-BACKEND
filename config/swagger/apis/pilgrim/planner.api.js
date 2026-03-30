/**
 * @swagger
 * tags:
 *   name: Planners - Pilgrim
 *   description: Lập kế hoạch hành hương
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PlannerWithItems:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *         companion_count:
 *           type: integer
 *         transportation:
 *           type: string
 *         budget:
 *           type: number
 *         status:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               leg_number:
 *                 type: integer
 *               estimated_time:
 *                 type: string
 *               rest_duration:
 *                 type: string
 *               note:
 *                 type: string
 *               site:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 */

/**
 * @swagger
 * /api/planners:
 *   post:
 *     summary: Tạo kế hoạch mới
 *     description: |
 *       Tạo planner mới.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlannerRequest'
 *     responses:
 *       201:
 *         description: Tạo kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Lỗi xác thực
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/planners:
 *   get:
 *     summary: Lấy danh sách kế hoạch của người dùng
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số mục trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerListResponse'
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/planners/{id}:
 *   get:
 *     summary: Lấy kế hoạch theo ID
 *     description: |
 *       Lấy thông tin chi tiết kế hoạch.
 *       Tự động chuyển trạng thái từ 'planning' sang 'ongoing' khi today >= start_date.
 *       Trạng thái điểm đến luôn mặc định là 'upcoming' cho đến khi được chốt là 'visited' hoặc 'skipped'.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Lấy kế hoạch thành công
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
 *                   $ref: '#/components/schemas/PlannerWithItems'
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}/checkin:
 *   post:
 *     summary: Thành viên check-in vào một địa điểm
 *     description: |
 *       - Điểm đến phải đang ở trạng thái **upcoming**
 *       - Các điểm trước trong lịch trình phải là **visited** hoặc **skipped** thì mới được check-in điểm này
 *       - Ghi nhận thông tin GPS để xác thực có mặt
 *       - Ai check-in sẽ có bản ghi `checked_in` trong bảng `user_checkins`
 *     tags: [Check-in History - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của item
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           examples:
 *             markVisited:
 *               summary: Chốt điểm đến là visited
 *               value:
 *                 status: visited
 *             markSkipped:
 *               summary: Bỏ qua điểm đến
 *               value:
 *                 status: skipped
 *                 skip_reason: "Trời mưa lớn, đoàn không thể tiếp tục"
 *           schema:
 *             type: object
 *             properties:
 *               checkin_latitude:
 *                 type: number
 *                 description: Vĩ độ GPS của người check-in
 *                 example: 10.7769
 *               checkin_longitude:
 *                 type: number
 *                 description: Kinh độ GPS của người check-in
 *                 example: 106.7009
 *               note:
 *                 type: string
 *                 description: Ghi chú khi check-in
 *     responses:
 *       200:
 *         description: Check-in thành công
 *       400:
 *         description: |
 *           - Điểm đến không đang ở trạng thái upcoming
 *           - Điểm trước chưa được visited/skipped
 *           - Đã check-in điểm này rồi
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải thành viên của chuyến đi
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc item
 */

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}/status:
 *   patch:
 *     summary: "[Trưởng đoàn] Cập nhật trạng thái điểm đến (visited/skipped)"
 *     description: |
 *       **Chỉ dành cho Trưởng đoàn (Owner)**.
 *
 *       - Truyền `status: "visited"`: Phải có ít nhất 1 thành viên đã check-in tại điểm này. Những người chưa check-in sẽ bị tự động ghi **missed**. Nếu đây là điểm cuối cùng cần xử lý, planner có thể chuyển sang **completed**.
 *       - Truyền `status: "skipped"`: Chỉ hợp lệ khi chưa có ai check-in tại điểm này và phải kèm `skip_reason`. Hệ thống đánh dấu điểm đến là **skipped** và gửi thông báo cho các thành viên còn lại.
 *       - Endpoint chỉ thao tác được khi planner đang **ongoing** và item còn **upcoming**.
 *     tags: [Check-in History - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của điểm đến
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
 *                 enum: [visited, skipped]
 *                 description: "Trạng thái mới muốn đổi"
 *               skip_reason:
 *                 type: string
 *                 example: "Trời mưa lớn, đoàn không thể tiếp tục"
 *                 description: "Lý do bỏ qua điểm đến. Bắt buộc khi `status = skipped`, bỏ qua khi `status = visited`"
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Status không hợp lệ, planner/item không còn cho phép cập nhật, `visited` khi chưa có ai check-in, hoặc `skipped` sau khi đã có người check-in
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải Trưởng đoàn
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc item
 */

/**
 * @swagger
 * /api/planners/{id}:
 *   put:
 *     summary: Cập nhật kế hoạch
 *     description: Cập nhật nhiều trường của kế hoạch như tên, ngày, số người, phương tiện, ngân sách
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlannerRequest'
 *     responses:
 *       200:
 *         description: Cập nhật kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Lỗi xác thực
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}:
 *   delete:
 *     summary: Xóa kế hoạch
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Xóa kế hoạch thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/items:
 *   post:
 *     summary: Thêm điểm vào kế hoạch
 *     description: Thêm một địa điểm vào một ngày cụ thể trong kế hoạch. Kiểm tra khoảng cách áp dụng cho điểm thứ 2 trở đi trong cùng ngày.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPlannerItemRequest'
 *     responses:
 *       201:
 *         description: Thêm điểm thành công (có thể bao gồm cảnh báo khoảng cách)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddItemResponse'
 *       400:
 *         description: Lỗi xác thực hoặc khoảng cách quá xa (>500km)
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc địa điểm
 */

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}:
 *   delete:
 *     summary: Xóa một địa điểm khỏi kế hoạch
 *     description: Xóa một địa điểm và tự động sắp xếp lại các địa điểm còn lại trong cùng ngày
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Xóa địa điểm thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc địa điểm
 */

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}:
 *   put:
 *     summary: Cập nhật một điểm trong kế hoạch
 *     description: Cập nhật giờ dự kiến, thời gian nghỉ, ghi chú của một địa điểm. Lưu ý - estimated_time chỉ có thể cập nhật cho điểm đầu tiên trong ngày.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estimated_time:
 *                 type: string
 *                 description: Giờ dự kiến đến (chỉ cho điểm đầu tiên trong ngày)
 *                 example: "09:30"
 *               rest_duration:
 *                 type: string
 *                 description: Thời gian nghỉ ngơi tại địa điểm (tối thiểu 1 tiếng)
 *                 example: "2 hours"
 *               note:
 *                 type: string
 *                 description: Ghi chú
 *                 example: "Nhớ mang theo ô"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerItem'
 *       400:
 *         description: Lỗi xác thực hoặc không thể cập nhật estimated_time cho điểm không phải đầu tiên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc địa điểm
 */

/**
 * @swagger
 * /api/planners/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái kế hoạch (lock/start/complete/cancel)
 *     description: |
 *       Cập nhật trạng thái kế hoạch với các giá trị:
 *       - **locked**: Chuyển planner sang trạng thái khoá để demo hoặc chốt planner sớm (planning -> locked)
 *         - Backend sẽ set status = locked và is_locked = true
 *       - **ongoing**: Bắt đầu kế hoạch (locked -> ongoing)
 *         - Yêu cầu planner có start_date, end_date, lịch trình hợp lệ và planner đã ở trạng thái locked
 *       - **completed**: Hoàn thành kế hoạch (ongoing -> completed)
 *         - Nếu 0 địa điểm đã visit thì hệ thống sẽ chuyển sang cancelled
 *       - **cancelled**: Huỷ planner khi transition hợp lệ
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
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
 *                 enum: [locked, ongoing, completed, cancelled]
 *                 description: |
 *                   - 'locked': Chốt planner và đặt is_locked = true
 *                   - 'ongoing': Bắt đầu kế hoạch (locked -> ongoing)
 *                   - 'completed': Hoàn thành kế hoạch (ongoing -> completed)
 *                   - 'cancelled': Huỷ planner
 *           example:
 *             status: "locked"
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
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Planner'
 *       400:
 *         description: |
 *           - Kế hoạch không ở trạng thái hợp lệ
 *           - Transition status không hợp lệ
 *           - Thiếu start_date/end_date khi chuyển sang ongoing
 *           - Planner chưa ở trạng thái locked nhưng cố gắng chuyển sang ongoing
 *           - Check-in không hợp lệ khi hoàn thành
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/lock:
 *   patch:
 *     summary: "[Trưởng đoàn] Khóa chỉnh sửa planner (Edit Lock)"
 *     description: |
 *       **Chỉ dành cho Trưởng đoàn (Owner)**.
 *       Endpoint này chỉ đổi is_locked = true
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của hành trình
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_locked
 *             properties:
 *               is_locked:
 *                 type: boolean
 *                 description: |
 *                   - true: Khoá chỉnh sửa planner (is_locked = true)
 *                   - false: Mở khoá chỉnh sửa planner (is_locked = false)
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
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Planner'
 *       400:
 *         description: Lỗi xác thực hoặc không phải hành trình nhóm
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải Trưởng đoàn
 *       404:
 *         description: Không tìm thấy hành trình
 */

/**
 * @swagger
 * /api/planners/{id}/progress:
 *   get:
 *     summary: Lấy tiến độ của tất cả thành viên trong planner
 *     description: |
 *       Trả về thông tin tiến độ check-in của tất cả thành viên.
 *       Chỉ owner hoặc member mới xem được.
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
 *     responses:
 *       200:
 *         description: Thông tin tiến độ check-in của các thành viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải owner hoặc thành viên
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

module.exports = {};
