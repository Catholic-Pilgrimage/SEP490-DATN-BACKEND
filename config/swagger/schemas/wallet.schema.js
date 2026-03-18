/**
 * @swagger
 * components:
 *   schemas:
 *     WalletInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         balance:
 *           type: number
 *           example: 500000
 *           description: Số dư khả dụng (có thể rút hoặc dùng để đặt cọc)
 *         locked_balance:
 *           type: number
 *           example: 200000
 *           description: Số dư bị khóa (đang đặt cọc cho các Planner)
 *         total_balance:
 *           type: number
 *           example: 700000
 *           description: Tổng số dư (balance + locked_balance)
 *         status:
 *           type: string
 *           enum: [active, locked]
 *           example: active
 *           description: Trạng thái ví
 *
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         wallet_id:
 *           type: string
 *           format: uuid
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         amount:
 *           type: number
 *           example: 100000
 *           description: Số tiền giao dịch (VND)
 *         type:
 *           type: string
 *           enum: 
 *             - topup
 *             - withdraw
 *             - escrow_lock
 *             - escrow_refund
 *             - penalty_applied
 *             - penalty_received
 *             - penalty_refunded
 *           example: topup
 *           description: |
 *             Loại giao dịch:
 *             - topup: Nạp tiền vào ví (qua PayOS)
 *             - withdraw: Rút tiền khỏi ví (admin chuyển tay)
 *             - escrow_lock: Đóng băng tiền cọc khi tạo/join planner
 *             - escrow_refund: Hoàn trả cọc (khi planner completed hoặc bị kick)
 *             - penalty_applied: Tiền phạt bị trừ (khi tự rời nhóm)
 *             - penalty_received: Tiền phạt nhận được (Owner - PENDING cho đến khi verify)
 *             - penalty_refunded: Hoàn trả tiền phạt (nếu plan ma)
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *           example: completed
 *           description: Trạng thái giao dịch
 *         reference_type:
 *           type: string
 *           example: planner
 *           description: Loại entity liên quan (planner, payos_order, etc.)
 *         reference_id:
 *           type: string
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *           description: ID của entity liên quan
 *         description:
 *           type: string
 *           example: Đặt cọc 100,000 VND cho kế hoạch "Hành hương Thánh địa"
 *           description: Mô tả giao dịch
 *         proof_image_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: https://cloudinary.com/image/proof123.jpg
 *           description: URL ảnh bill chuyển khoản (dùng cho withdraw)
 *         code:
 *           type: string
 *           nullable: true
 *           example: TXN202603184F7K
 *           description: Mã giao dịch (TXNYYYYMMDDXXXX) — dùng để tra cứu, hiển thị cho user
 *         bank_info:
 *           type: object
 *           nullable: true
 *           description: Thông tin ngân hàng (chỉ có với loại withdraw)
 *           properties:
 *             account_number:
 *               type: string
 *               example: "0927174002"
 *             account_name:
 *               type: string
 *               example: "NGO HUYNH TUAN"
 *             bank_code:
 *               type: string
 *               example: "970423"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2024-01-15T10:30:00Z
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: 2024-01-15T10:35:00Z
 */

module.exports = {};
