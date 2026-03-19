/**
 * @swagger
 * tags:
 *   name: Admin - Finance
 *   description: Quản lý tài chính toàn hệ thống (chỉ Admin)
 */

/**
 * @swagger
 * /api/admin/dashboard/finance:
 *   get:
 *     summary: Tổng quan tài chính hệ thống
 *     tags: [Admin - Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy tổng quan tài chính thành công
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
 *                     total_escrow_locked:
 *                       type: number
 *                       description: Tổng tiền cọc đang giữ (net sau hoàn)
 *                       example: 5000000
 *                     total_pending_payouts:
 *                       type: number
 *                       description: Tổng tiền phạt chờ giải ngân
 *                       example: 300000
 *                     total_withdrawn_today:
 *                       type: number
 *                       description: Tổng tiền rút thành công hôm nay
 *                       example: 150000
 *                     total_transactions_today:
 *                       type: integer
 *                       description: Số GD hôm nay
 *                       example: 12
 *                     failed_payouts_today:
 *                       type: integer
 *                       description: Số lệnh rút thất bại hôm nay
 *                       example: 2
 *                     total_wallet_balance:
 *                       type: number
 *                       description: Tổng số dư ví user toàn hệ thống
 *                       example: 8200000
 *                     total_withdraw_failed:
 *                       type: number
 *                       description: Tổng số tiền rút thất bại (toàn thời gian)
 *                       example: 450000
 *                     active_escrow_planners:
 *                       type: integer
 *                       description: Số planner đang giữ tiền escrow
 *                       example: 9
 */

/**
 * @swagger
 * /api/admin/wallet/transactions:
 *   get:
 *     summary: Danh sách tất cả giao dịch toàn hệ thống
 *     tags: [Admin - Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [escrow_lock, escrow_refund, penalty_applied, penalty_received, penalty_refunded, withdraw, topup]
 *         description: Lọc theo loại GD
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *       - in: query
 *         name: reference_type
 *         schema:
 *           type: string
 *           enum: [planner, planner_deposit, planner_penalty, wallet]
 *       - in: query
 *         name: planner_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo planner
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Đến ngày (YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc email user
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
 *     responses:
 *       200:
 *         description: Lấy danh sách giao dịch thành công
 */

/**
 * @swagger
 * /api/admin/wallet/escrow:
 *   get:
 *     summary: Danh sách planner đang giữ tiền escrow
 *     tags: [Admin - Finance]
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
 *     responses:
 *       200:
 *         description: Lấy danh sách escrow thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     escrow:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           planner_id:
 *                             type: string
 *                           planner_name:
 *                             type: string
 *                           status:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date
 *                           end_date:
 *                             type: string
 *                             format: date
 *                           owner:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               full_name:
 *                                 type: string
 *                           member_count:
 *                             type: integer
 *                           deposit_amount:
 *                             type: number
 *                           total_locked:
 *                             type: number
 *                             description: Tổng cọc
 *                           net_locked:
 *                             type: number
 *                             description: Tổng cọc còn giữ (sau hoàn tiền)
 *                           penalty_pending:
 *                             type: number
 *                             description: Tiền phạt chờ giải ngân
 */

/**
 * @swagger
 * /api/admin/wallet/withdrawals:
 *   get:
 *     summary: Lịch sử lệnh rút tiền toàn hệ thống
 *     tags: [Admin - Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
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
 *     responses:
 *       200:
 *         description: Lấy lịch sử rút tiền thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     withdrawals:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           reference_id:
 *                             type: string
 *                             description: PayOS payout ID
 *                           bank_info:
 *                             type: object
 *                             properties:
 *                               account_number:
 *                                 type: string
 *                               account_name:
 *                                 type: string
 *                               bank_code:
 *                                 type: string
 *                           error_message:
 *                             type: string
 *                             nullable: true
 *                             description: Lý do thất bại (nếu failed)
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               avatar_url:
 *                                 type: string
 */

module.exports = {};
