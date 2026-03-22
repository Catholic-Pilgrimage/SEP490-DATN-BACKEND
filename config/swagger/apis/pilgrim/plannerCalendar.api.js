/**
 * @swagger
 * tags:
 *   name: Pilgrim - Planner Calendar
 *   description: Đồng bộ kế hoạch với device calendar (expo-calendar)
 */

/**
 * @swagger
 * /api/planners/{id}/calendar-sync:
 *   get:
 *     summary: Lấy dữ liệu kế hoạch để đồng bộ với lịch (expo-calendar)
 *     description: |
 *       Trả về dữ liệu đã format sẵn cho mobile app sync vào device calendar.
 *       Mobile app sẽ dùng expo-calendar để tạo events local.
 *       
 *       **Response bao gồm:**
 *       - Thông tin planner (tên, ngày, số người, phương tiện)
 *       - Danh sách events với startDate, endDate, location, notes đã format
 *       - Metadata cho mỗi event (site_id, coordinates, leg_number)
 *       - Alarms mặc định (-30 phút và -60 phút trước event)
 *       
 *       **Mobile app workflow:**
 *       1. Gọi API này
 *       2. Xin quyền calendar (expo-calendar)
 *       3. Chọn calendar muốn lưu
 *       4. Loop qua events để create/update
 *     tags: [Pilgrim - Planner Calendar]
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
 *         description: Lấy dữ liệu đồng bộ lịch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarSyncResponse'
 *       400:
 *         description: Kế hoạch phải có ngày bắt đầu và kết thúc
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu hoặc thành viên
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

module.exports = {};
