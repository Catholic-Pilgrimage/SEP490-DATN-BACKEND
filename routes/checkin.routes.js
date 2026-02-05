const express = require('express');
const router = express.Router();
const CheckinController = require('../controllers/CheckinController');
const CheckinValidator = require('../validators/checkin.validator');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Check-ins - Pilgrim
 *   description: Check-in tại các điểm trong kế hoạch
 */

/**
 * @swagger
 * /api/planner-items/{id}/checkin:
 *   post:
 *     summary: Check-in tại một điểm trong kế hoạch
 *     description: |
 *       Cho phép người dùng check-in tại một điểm trong kế hoạch của họ.
 *       
 *       **Quy tắc GPS:**
 *       - Hệ thống tính khoảng cách đi bộ thực tế (theo đường đi) bằng VietMap API
 *       - Check-in hợp lệ nếu khoảng cách đi bộ ≤ 100m
 *       - Mỗi điểm chỉ được check-in 1 lần
 *       
 *       **Lưu ý:**
 *       - Không cần gửi user_id (lấy từ JWT)
 *       - Không cần gửi site_id (backend tự suy ra từ planner item)
 *       - Khoảng cách được tính theo đường đi bộ, không phải đường chim bay
 *     tags: [Check-ins - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của planner item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 10.371395
 *                 description: Vĩ độ hiện tại của người dùng
 *               longitude:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 107.062612
 *                 description: Kinh độ hiện tại của người dùng
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Đã đến nơi"
 *                 description: Ghi chú tùy chọn
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
 *                     distance:
 *                       type: integer
 *                       example: 45
 *                       description: Khoảng cách tính bằng mét
 *                     is_valid:
 *                       type: boolean
 *                       example: true
 *                       description: true nếu khoảng cách ≤ 100m
 *       400:
 *         description: Lỗi xác thực hoặc đã check-in rồi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Bạn đã check-in điểm này rồi"
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy planner item
 */
router.post(
    '/:id/checkin',
    authMiddleware,
    CheckinValidator.checkin,
    CheckinController.checkin
);

module.exports = router;
