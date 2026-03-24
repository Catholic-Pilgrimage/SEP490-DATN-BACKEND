/**
 * @swagger
 * tags:
 *   name: Pilgrim - Planner Share
 *   description: Chia sẻ kế hoạch hành hương
 */

/**
 * @swagger
 * /api/planners/invite/{token}:
 *   get:
 *     summary: Xem trước kế hoạch qua link mời (không cần đăng nhập)
 *     description: Trả về thông tin kế hoạch và trạng thái lời mời để FE hiển thị preview trước khi người dùng đăng nhập/đăng ký.
 *     tags: [Pilgrim - Planner Share]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token lời mời
 *     responses:
 *       200:
 *         description: Trả về thông tin lời mời và kế hoạch thành công
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
 *                     invite:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         invite_type:
 *                           type: string
 *                           enum: [friend, external]
 *                         status:
 *                           type: string
 *                         expires_at:
 *                           type: string
 *                           format: date-time
 *                     planner:
 *                       $ref: '#/components/schemas/PlannerWithItems'
 *       400:
 *         description: Lời mời đã hết hạn
 *       404:
 *         description: Không tìm thấy lời mời
 */



/**
 * @swagger
 * /api/planners/{id}/invite:
 *   post:
 *     summary: Mời người dùng vào kế hoạch
 *     description: Gửi email mời một người dùng khác tham gia vào kế hoạch. Chỉ chủ sở hữu mới có quyền mời.
 *     tags: [Pilgrim - Planner Share]
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
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email của người được mời
 *     responses:
 *       200:
 *         description: Đã gửi lời mời thành công
 *       400:
 *         description: Lỗi xác thực, kế hoạch đã đầy, hoặc người dùng đã là thành viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc người dùng
 */

/**
 * @swagger
 * /api/planners/{id}/invite-friend:
 *   post:
 *     summary: Mời bạn bè vào kế hoạch (không cần cọc)
 *     description: |
 *       Mời một người bạn (đã kết bạn) tham gia kế hoạch.
 *       - Chỉ chủ sở hữu mới có quyền mời.
 *       - Hai người phải đã là bạn bè (status = accepted).
 *       - Tạo lời mời kiểu `friend` với `status = pending`.
 *       - Người được mời sẽ nhận notification và vẫn phải accept/reject qua token.
 *       - Khi accept, người được mời join **không cần đặt cọc**.
 *     tags: [Pilgrim - Planner Share]
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
 *             type: object
 *             required:
 *               - friend_id
 *             properties:
 *               friend_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của bạn bè muốn mời
 *     responses:
 *       200:
 *         description: Đã gửi lời mời bạn bè thành công
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     invite_type:
 *                       type: string
 *                       enum: [friend]
 *                     friend:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     token:
 *                       type: string
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     planner_name:
 *                       type: string
 *       400:
 *         description: Lỗi - chưa là bạn, planner đầy, hoặc đã mời
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc người dùng
 */

/**
 * @swagger
 * /api/planners/invite/{token}:
 *   post:
 *     summary: Phản hồi lời mời (Chấp nhận/Từ chối)
 *     description: |
 *       Người được mời phản hồi lời mời bằng token. Behavior phụ thuộc vào `invite_type`:
 *
 *       **Friend invite (`invite_type = friend`):**
 *       - **accept**: Join nhóm ngay, không cần cọc. Response trả `deposit_required = false, joined = true`.
 *       - **reject**: Invite chuyển sang `rejected`.
 *       - Xác thực bằng `invitee_user_id` (không phải email).
 *
 *       **External invite (`invite_type = external`):**
 *       - **accept**: Invite chuyển sang `awaiting_payment`.
 *         - Nếu ví đủ tiền → tự trừ, join luôn. Response: `deposit_required = false, paid_from_wallet = true`.
 *         - Nếu ví không đủ → trả link PayOS. Response: `deposit_required = true, checkout_url = ...`.
 *       - **reject**: Invite chuyển sang `rejected`.
 *       - Xác thực bằng email khớp với invite.
 *     tags: [Pilgrim - Planner Share]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token của lời mời
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Hành động (chấp nhận hoặc từ chối)
 *     responses:
 *       200:
 *         description: |
 *           Phản hồi thành công. Response khác nhau tùy invite_type:
 *           - **Friend**: `{ deposit_required: false, joined: true, planner_name, message }`
 *           - **External (wallet)**: `{ deposit_required: false, paid_from_wallet: true, transaction_id, wallet_balance_after }`
 *           - **External (PayOS)**: `{ deposit_required: true, checkout_url, order_code, qr_code, amount }`
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     deposit_required:
 *                       type: boolean
 *                       description: |
 *                         - `false`: Friend invite (join thẳng) hoặc đã trừ cọc từ ví
 *                         - `true`: Cần thanh toán qua PayOS (chỉ external invite)
 *                     joined:
 *                       type: boolean
 *                       description: true nếu đã join nhóm (chỉ friend invite)
 *                     paid_from_wallet:
 *                       type: boolean
 *                       description: true nếu đã trừ tiền từ ví (chỉ external invite)
 *                     transaction_id:
 *                       type: string
 *                       format: uuid
 *                       description: ID giao dịch (khi paid_from_wallet = true)
 *                     wallet_balance_after:
 *                       type: number
 *                       description: Số dư ví sau khi trừ (khi paid_from_wallet = true)
 *                     checkout_url:
 *                       type: string
 *                       description: Link PayOS (chỉ khi deposit_required = true)
 *                     order_code:
 *                       type: number
 *                     qr_code:
 *                       type: string
 *                     wallet_balance:
 *                       type: number
 *                       description: Số dư ví hiện tại (khi deposit_required = true)
 *                     amount:
 *                       type: number
 *                     planner_name:
 *                       type: string
 *                     message:
 *                       type: string
 *       400:
 *         description: Hành động không hợp lệ, lời mời đã xử lý hoặc hết hạn
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (Email không khớp hoặc invitee_user_id không khớp)
 *       404:
 *         description: Không tìm thấy lời mời
 */

/**
 * @swagger
 * /api/planners/{id}/invites:
 *   get:
 *     summary: Lấy danh sách lời mời của kế hoạch
 *     description: Lấy danh sách các lời mời chưa xử lý hoặc đã gửi của kế hoạch. Chỉ chủ sở hữu mới có quyền xem.
 *     tags: [Pilgrim - Planner Share]
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
 *         description: Trả về danh sách lời mời
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/members:
 *   get:
 *     summary: Lấy danh sách thành viên của kế hoạch
 *     description: Lấy danh sách tất cả thành viên của kế hoạch (bao gồm chủ sở hữu và những người đã tham gia). Cả chủ sở hữu và thành viên đều có thể xem.
 *     tags: [Pilgrim - Planner Share]
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
 *         description: Trả về danh sách thành viên
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/{id}/members/{memberId}:
 *   delete:
 *     summary: Xóa thành viên khỏi kế hoạch
 *     description: Cập nhật thành viên trong kế hoạch. Chủ sở hữu có thể xóa bất kỳ thành viên nào. Thành viên chỉ có thể tự xóa chính mình rời khỏi kế hoạch.
 *     tags: [Pilgrim - Planner Share]
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
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thành viên cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành viên / Rời nhóm thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner_name:
 *                       type: string
 *                     member_id:
 *                       type: string
 *                       format: uuid
 *                     action:
 *                       type: string
 *                       enum: [kicked, left]
 *                       description: kicked = bị owner xóa, left = tự rời
 *                     deposit_status:
 *                       type: string
 *                       enum: [paid, refunded, penalized, unpaid]
 *                     join_status:
 *                       type: string
 *                       enum: [kicked, dropped_out]
 *                     deposit_amount:
 *                       type: number
 *                       description: Số tiền cọc (nếu có)
 *                     refund_amount:
 *                       type: number
 *                       description: Số tiền hoàn (nếu có)
 *                     penalty_percentage:
 *                       type: number
 *                       description: Phần trăm phạt (nếu tự rời + có phạt)
 *                     penalty_amount:
 *                       type: number
 *                       description: Số tiền phạt (nếu có)
 *                     message:
 *                       type: string
 *       400:
 *         description: Không thể xóa chủ sở hữu hoặc không thể xóa khi chuyến đi đang diễn ra
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc thành viên
 */



/**
 * @swagger
 * /api/planners/{id}/cancel-deposit:
 *   post:
 *     summary: Huỷ thanh toán cọc đang chờ
 *     description: |
 *       Huỷ link PayOS đang chờ và đặt lại trạng thái invite.
 *       - `reject: false` (mặc định): invite về lại `pending`, user có thể thử lại sau.
 *       - `reject: true`: invite chuyển thành `rejected`, không thể join nữa.
 *     tags: [Pilgrim - Planner Share]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reject:
 *                 type: boolean
 *                 default: false
 *                 description: true = huỷ hẳn (rejected), false = thử lại sau (về pending)
 *     responses:
 *       200:
 *         description: Huỷ thành công
 *       400:
 *         description: Không có thanh toán đang chờ
 *       401:
 *         description: Chưa xác thực
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

/**
 * @swagger
 * /api/planners/deposit-webhook:
 *   post:
 *     summary: Webhook PayOS xác nhận thanh toán cọc (Public endpoint)
 *     description: Endpoint được PayOS gọi tự động khi thanh toán cọc thành công. Không cần authentication. Cập nhật deposit_status = paid và cộng locked_balance.
 *     tags: [Pilgrim - Planner Share]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Dữ liệu webhook từ PayOS
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */

/**
 * @swagger
 * /api/planners/{id}/transactions:
 *   get:
 *     summary: Xem sao kê quỹ nhóm (minh bạch tài chính)
 *     description: Công khai toàn bộ giao dịch tài chính liên quan đến planner cho các thành viên trong nhóm. Bao gồm đóng cọc, hoàn tiền, phạt, và nhận phạt.
 *     tags: [Pilgrim - Planner Share]
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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [escrow_lock, escrow_refund, penalty_applied, penalty_received, penalty_refunded]
 *         description: Lọc theo loại giao dịch
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy sao kê thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       description: Tổng hợp quỹ nhóm
 *                       properties:
 *                         total_fund_locked:
 *                           type: number
 *                           description: Tiền cọc đang giữ (chưa giải ngân)
 *                           example: 400000
 *                         total_penalty_pending:
 *                           type: number
 *                           description: Tiền phạt chờ giải ngân cho owner
 *                           example: 50000
 *                         total_penalty_received:
 *                           type: number
 *                           description: Tiền phạt owner đã nhận
 *                           example: 30000
 *                         total_refunded:
 *                           type: number
 *                           description: Tổng tiền đã hoàn cho thành viên
 *                           example: 100000
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [escrow_lock, escrow_refund, penalty_applied, penalty_received, penalty_refunded]
 *                           label:
 *                             type: string
 *                             description: Nhãn dễ đọc cho FE
 *                             example: "Đóng tiền cam kết"
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           wallet:
 *                             type: object
 *                             properties:
 *                               user:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   full_name:
 *                                     type: string
 *                                   avatar_url:
 *                                     type: string
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền (không phải thành viên)
 *       404:
 *         description: Không tìm thấy kế hoạch
 */

