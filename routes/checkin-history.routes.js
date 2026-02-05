const express = require('express');
const router = express.Router();
const CheckinController = require('../controllers/CheckinController');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Check-ins - Pilgrim
 *   description: Check-in tại các điểm trong kế hoạch
 */

/**
 * @swagger
 * /api/checkins/me:
 *   get:
 *     summary: Lấy danh sách check-in của tôi
 *     description: Lấy tất cả các địa điểm mà user đã check-in, sắp xếp theo thời gian mới nhất
 *     tags: [Check-ins - Pilgrim]
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
 *                         description: ID của planner item (dùng để tạo journal)
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
 *                       note:
 *                         type: string
 *                         nullable: true
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
router.get(
    '/me',
    authMiddleware,
    CheckinController.getUserCheckins
);

module.exports = router;
