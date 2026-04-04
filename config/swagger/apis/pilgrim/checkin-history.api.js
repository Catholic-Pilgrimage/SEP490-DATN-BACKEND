/**
 * @swagger
 * tags:
 *   name: Check-in History - Pilgrim
 *   description: Lịch sử check-in của người dùng
 */

/**
 * @swagger
 * /api/checkins/me:
 *   get:
 *     summary: Lấy danh sách check-in của tôi
 *     description: Lấy tất cả các địa điểm mà user đã check-in, sắp xếp theo thời gian mới nhất
 *     tags: [Check-in History - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách check-in thành công
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
 *                   example: "Lấy danh sách check-in thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         description: ID của check-in
 *                       planner_item_id:
 *                         type: string
 *                         format: uuid
 *                         description: ID của planner item
 *                       checkin_date:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-05T12:30:00Z"
 *                       distance_meters:
 *                         type: integer
 *                         example: 45
 *                       is_valid:
 *                         type: boolean
 *                         example: true
 *                       status:
 *                         type: string
 *                         enum: [checked_in, missed, pending]
 *                       note:
 *                         type: string
 *                         nullable: true
 *                       photo_url:
 *                         type: string
 *                         nullable: true
 *                         example: "https://res.cloudinary.com/xxx/image/upload/v123/checkin.jpg"
 *                       site:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                             example: "Nhà thờ Đức Bà"
 *                           code:
 *                             type: string
 *                           province:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *       401:
 *         description: Chưa xác thực
 */

module.exports = {};
