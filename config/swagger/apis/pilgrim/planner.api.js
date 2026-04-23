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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, locked, ongoing, completed, cancelled]
 *         description: Lọc theo trạng thái kế hoạch
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
 *       - Bắt buộc upload ảnh chụp check-in qua field `photo`
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
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - photo
 *             properties:
 *               latitude:
 *                 type: number
 *                 description: Vĩ độ GPS của người check-in
 *                 example: 10.7769
 *               longitude:
 *                 type: number
 *                 description: Kinh độ GPS của người check-in
 *                 example: 106.7009
 *               note:
 *                 type: string
 *                 description: Ghi chú khi check-in
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh check-in bắt buộc
 *     responses:
 *       200:
 *         description: Check-in thành công
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
 *                   example: "Check-in thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkin_id:
 *                       type: string
 *                       format: uuid
 *                     distance:
 *                       type: integer
 *                       example: 45
 *                     is_valid:
 *                       type: boolean
 *                       example: true
 *                     planner_status:
 *                       type: string
 *                       example: "ongoing"
 *                     photo_url:
 *                       type: string
 *                       example: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                     message:
 *                       type: string
 *                       example: "Check-in thành công"
 *       400:
 *         description: |
 *           - Điểm đến không đang ở trạng thái upcoming
 *           - Điểm trước chưa được visited/skipped
 *           - Đã check-in điểm này rồi
 *           - Thiếu ảnh check-in hoặc tọa độ không hợp lệ
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
 *           examples:
 *             markVisited:
 *               summary: Trưởng đoàn chốt điểm đến là visited
 *               value:
 *                 status: visited
 *             markSkipped:
 *               summary: Trưởng đoàn bỏ qua điểm đến
 *               value:
 *                 status: skipped
 *                 skip_reason: "Trời mưa lớn, đoàn không thể tiếp tục"
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
 * /api/planners/{id}/items:
 *   delete:
 *     summary: Xóa toàn bộ địa điểm khỏi kế hoạch
 *     description: |
 *       Xóa toàn bộ `planner_items` của một kế hoạch trong một lần.
 *
 *       Điều kiện:
 *       - Chỉ chủ kế hoạch mới được thực hiện
 *       - Planner chưa bị lock
 *       - Chưa gửi lời mời đầu tiên hoặc chưa có thêm thành viên tham gia
 *       - Planner không ở trạng thái ongoing, completed, cancelled
 *       - Tất cả item hiện tại phải còn ở trạng thái `upcoming`
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
 *     responses:
 *       200:
 *         description: Xóa toàn bộ địa điểm thành công
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
 *                   example: "Đã xóa toàn bộ 3 địa điểm trong kế hoạch"
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner_id:
 *                       type: string
 *                       format: uuid
 *                     deleted_count:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Planner đã lock, đã có lời mời đầu tiên, hoặc có item không còn ở trạng thái upcoming
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
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
 * /api/planners/{id}/items/swap:
 *   patch:
 *     summary: Đổi chỗ 2 điểm đến trong kế hoạch
 *     description: |
 *       Đổi chỗ (swap) 2 item bất kỳ trong planner. Hỗ trợ cả cùng ngày và khác ngày.
 *
 *       Mobile client gửi kèm `affected_days` chứa snapshot thời gian đã tính sẵn
 *       (bao gồm travel time từ VietMap). Backend validate cấu trúc rồi áp dụng
 *       nguyên khối trong 1 transaction.
 *
 *       Điều kiện:
 *       - Chỉ owner mới được thực hiện
 *       - Planner phải đang ở trạng thái `planning`
 *       - Planner chưa bị lock
 *       - Cả 2 item phải còn ở trạng thái `upcoming`
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
 *             $ref: '#/components/schemas/SwapPlannerItemsRequest'
 *     responses:
 *       200:
 *         description: Đổi chỗ thành công
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
 *                   example: "Đổi chỗ 2 địa điểm thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner_id:
 *                       type: string
 *                       format: uuid
 *                     swapped:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: uuid
 *                       example: ["uuid-item-a", "uuid-item-b"]
 *                     items_by_day:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/PlannerItem'
 *       400:
 *         description: |
 *           - Hai item trùng nhau
 *           - Payload affected_days không khớp
 *           - Planner đang ongoing/completed/cancelled
 *           - Item đã visited/skipped
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc item
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
 * /api/planners/{id}/days/{dayNumber}/close:
 *   post:
 *     summary: "[Trưởng đoàn] Chốt ngày hành hương"
 *     description: |
 *       **Chỉ dành cho Trưởng đoàn (Owner)**.
 *
 *       Dùng để chốt theo từng ngày khi planner đang **ongoing**.
 *
 *       Quy tắc:
 *       - Ngày cần chốt phải có địa điểm
 *       - Tất cả địa điểm trong ngày phải ở trạng thái **visited** hoặc **skipped**
 *       - Chốt theo thứ tự liên tiếp: phải chốt ngày trước đó trước (ngày 1 rồi mới ngày 2...)
 *
 *       Sau khi chốt ngày thành công, hệ thống không cho thêm địa điểm vào các ngày đã chốt.
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
 *       - in: path
 *         name: dayNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số ngày cần chốt (1, 2, 3...)
 *     responses:
 *       200:
 *         description: Chốt ngày thành công
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
 *                   example: "Đã chốt ngày 1 thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner_id:
 *                       type: string
 *                       format: uuid
 *                     closed_day:
 *                       type: integer
 *                       example: 1
 *                     next_day_to_close:
 *                       type: integer
 *                       nullable: true
 *                       example: 2
 *                     has_next_day:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: |
 *           - dayNumber không hợp lệ
 *           - Planner chưa ở trạng thái ongoing
 *           - Ngày chưa có địa điểm
 *           - Ngày chưa hoàn tất visited/skipped toàn bộ địa điểm
 *           - Chưa chốt đủ các ngày trước đó theo thứ tự
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
 *       `history` sẽ bao gồm cả các điểm đã `checked_in`, `missed`, và các điểm bị `skipped` bởi planner.
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
 *                   example: "Lấy tiến độ thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner_status:
 *                       type: string
 *                       example: "ongoing"
 *                     total_items:
 *                       type: integer
 *                       example: 5
 *                     total_members:
 *                       type: integer
 *                       example: 3
 *                     member_progress:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user_id:
 *                             type: string
 *                             format: uuid
 *                           total_items:
 *                             type: integer
 *                           checked_in:
 *                             type: integer
 *                           skipped_by_planner:
 *                             type: integer
 *                           missed:
 *                             type: integer
 *                           completed:
 *                             type: integer
 *                           percent:
 *                             type: integer
 *                             example: 80
 *                           history:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 planner_item_id:
 *                                   type: string
 *                                   format: uuid
 *                                 status:
 *                                   type: string
 *                                   enum: [checked_in, missed, skipped]
 *                                 checkin_date:
 *                                   type: string
 *                                   format: date-time
 *                                   nullable: true
 *                                 photo_url:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                                 skipped_at:
 *                                   type: string
 *                                   format: date-time
 *                                   nullable: true
 *                                 skip_reason:
 *                                   type: string
 *                                   nullable: true
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải owner hoặc thành viên
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/share:
 *   post:
 *     summary: Chia sẻ hành trình đã hoàn thành lên cộng đồng
 *     description: |
 *       Tạo một community post gắn với planner đã hoàn thành.
 *       Response trả về luôn post đã enrich với `journey.items` và `journey.items_by_day`.
 *       Khi đọc community posts qua `/api/posts`, payload sẽ có thêm `journey` gồm:
 *       - `name`, `start_date`, `end_date`, `number_of_people`, `min_people_required`, `transportation`
 *       - `summary` với số điểm `visited`, `skipped`, `upcoming`
 *       - `items` và `items_by_day` để hiển thị trạng thái từng điểm đến
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
 *         description: ID của planner đã hoàn thành
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *                 description: Nội dung bài chia sẻ. Nếu không truyền, hệ thống sẽ dùng nội dung mặc định.
 *                 example: "Chuyến đi này rất ý nghĩa, lịch trình cân đối và các điểm hành hương khá thuận tiện."
 *     responses:
 *       201:
 *         description: Chia sẻ thành công
 *       400:
 *         description: Planner chưa completed hoặc đã share trước đó
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không phải chủ planner
 *       404:
 *         description: Không tìm thấy planner
 */

/**
 * @swagger
 * /api/planners/{id}/clone:
 *   post:
 *     summary: Clone hành trình community thành planner mới
 *     description: |
 *       Clone một planner đã `completed` và đã được share ra community thành planner mới của người dùng hiện tại.
 *       Planner mới sẽ:
 *       - có trạng thái `planning`
 *       - reset toàn bộ item về `upcoming`
 *       - giữ thứ tự điểm đến, note, thời gian dự kiến, thời gian nghỉ, travel time
 *       - không copy `event_id`, không copy trạng thái visited/skipped cũ
 *       - `end_date` nếu truyền không được ngắn hơn tổng số ngày của hành trình gốc
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
 *         description: ID planner nguồn đã share lên community
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Hành trình Đức Mẹ La Vang (Bản riêng)"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-10"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-12"
 *               number_of_people:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               min_people_required:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2
 *               transportation:
 *                 type: string
 *                 enum: [motorbike, car, bus]
 *     responses:
 *       201:
 *         description: Clone thành công
 *       400:
 *         description: Planner nguồn chưa đủ điều kiện clone hoặc dữ liệu planner mới không hợp lệ
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy planner nguồn
 */

module.exports = {};

