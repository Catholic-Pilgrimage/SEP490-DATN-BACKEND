/**
 * @swagger
 * /api/planners/{id}/offline-data:
 *   get:
 *     summary: Tải dữ liệu kế hoạch để sử dụng ngoại tuyến
 *     description: |
 *       Lấy toàn bộ dữ liệu kế hoạch (planner) bao gồm thông tin kế hoạch, các điểm đến, hình ảnh/video, lịch trình thánh lễ và các địa điểm lân cận.
 *       Endpoint này được thiết kế để giáo dân tải toàn bộ dữ liệu cần thiết trước khi đi hành hương để sử dụng khi không có mạng.
 *       CHECK_IN action phải có `photo_url` hoáº·c `photo_base64`.
 *     tags:
 *       - Pilgrim - Offline Mode
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
 *         description: Tải gói dữ liệu ngoại tuyến thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OfflineDataResponse'
 *       401:
 *         description: Không có quyền truy cập (Unauthorized)
 *       403:
 *         description: Bị từ chối - Không phải là chủ sở hữu hoặc thành viên của kế hoạch
 *       404:
 *         description: Không tìm thấy kế hoạch
 *       500:
 *         description: Lỗi máy chủ
 *
 * /api/planners/sync/offline-actions:
 *   post:
 *     summary: Đồng bộ các hành động ngoại tuyến lên máy chủ
 *     description: |
 *       Tải lên và xử lý các hành động đã được thực hiện khi ngoại tuyến (check-in, viết nhật ký).
 *       Endpoint này xử lý tính đồng nhất (idempotency) bằng cách sử dụng client_action_id để ngăn chặn dữ liệu bị trùng lặp.
 *     tags:
 *       - Pilgrim - Offline Mode
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OfflineSyncRequest'
 *           examples:
 *             check_in_example:
 *               summary: Check-in action
 *               value:
 *                 actions:
 *                   - client_action_id: "mobile_1710501000_checkin_site123"
 *                     type: "CHECK_IN"
 *                     offline_time: "2024-03-15T10:30:00Z"
 *                     planner_item_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     latitude: 10.762622
 *                     longitude: 106.660172
 *                     photo_base64: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                     note: "Arrived at Notre-Dame Cathedral"
 *             journal_example:
 *               summary: Journal creation action
 *               value:
 *                 actions:
 *                   - client_action_id: "mobile_1710501600_journal_site123"
 *                     type: "CREATE_JOURNAL"
 *                     offline_time: "2024-03-15T11:00:00Z"
 *                     planner_item_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     title: "My spiritual reflection"
 *                     content: "Today I felt a deep connection with God..."
 *                     privacy: "private"
 *             multiple_actions:
 *               summary: Multiple actions
 *               value:
 *                 actions:
 *                   - client_action_id: "mobile_1710501000_checkin_site123"
 *                     type: "CHECK_IN"
 *                     offline_time: "2024-03-15T10:30:00Z"
 *                     planner_item_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     latitude: 10.762622
 *                     longitude: 106.660172
 *                     photo_url: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                   - client_action_id: "mobile_1710501600_journal_site123"
 *                     type: "CREATE_JOURNAL"
 *                     offline_time: "2024-03-15T11:00:00Z"
 *                     planner_item_id: "550e8400-e29b-41d4-a716-446655440000"
 *                     title: "My spiritual reflection"
 *                     content: "Today I felt a deep connection with God..."
 *                     privacy: "private"
 *     responses:
 *       200:
 *         description: Xử lý các hành động thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OfflineSyncResponse'
 *             examples:
 *               success:
 *                 summary: Đã đồng bộ tất cả hành động
 *                 value:
 *                   success: true
 *                   message: "Đồng bộ dữ liệu ngoại tuyến thành công"
 *                   data:
 *                     results:
 *                       - client_action_id: "mobile_1710501000_checkin_site123"
 *                         status: "synced"
 *                         checkin_id: "660e8400-e29b-41d4-a716-446655440000"
 *                         is_valid: true
 *                         distance_meters: 45
 *                         photo_url: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                       - client_action_id: "mobile_1710501600_journal_site123"
 *                         status: "synced"
 *                         journal_id: "770e8400-e29b-41d4-a716-446655440000"
 *               partial_success:
 *                 summary: Một số hành động thất bại
 *                 value:
 *                   success: true
 *                   message: "Đồng bộ dữ liệu ngoại tuyến hoàn tất"
 *                   data:
 *                     results:
 *                       - client_action_id: "mobile_1710501000_checkin_site123"
 *                         status: "synced"
 *                         checkin_id: "660e8400-e29b-41d4-a716-446655440000"
 *                         is_valid: true
 *                         distance_meters: 45
 *                         photo_url: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                       - client_action_id: "mobile_1710501600_journal_site123"
 *                         status: "failed"
 *                         error: "Không tìm thấy địa điểm trong kế hoạch"
 *               already_synced:
 *                 summary: Hành động đã được xử lý
 *                 value:
 *                   success: true
 *                   message: "Đồng bộ dữ liệu ngoại tuyến thành công"
 *                   data:
 *                     results:
 *                       - client_action_id: "mobile_1710501000_checkin_site123"
 *                         status: "already_synced"
 *                         message: "Hành động đã được xử lý"
 *       400:
 *         description: Yêu cầu không hợp lệ - Dữ liệu sai hoặc không có hành động nào
 *       401:
 *         description: Không có quyền truy cập (Unauthorized)
 *       500:
 *         description: Lỗi máy chủ
 */

module.exports = {};
