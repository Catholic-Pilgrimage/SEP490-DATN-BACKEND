/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Quản lý ví điện tử (Wallet Management)
 */

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Xem thông tin ví
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin ví thành công
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
 *                   example: Lấy thông tin ví thành công
 *                 data:
 *                   $ref: '#/components/schemas/WalletInfo'
 */

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Lịch sử giao dịch
 *     tags: [Wallet]
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
 *           default: 20
 *         description: Số lượng giao dịch mỗi trang
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [withdraw, escrow_lock, escrow_refund, penalty_applied, penalty_received, penalty_refunded]
 *         description: Lọc theo loại giao dịch
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Lấy lịch sử giao dịch thành công
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
 *                   example: Lấy lịch sử giao dịch thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *                     total:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 */

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Rút tiền về tài khoản ngân hàng (PayOS Chi tự động)
 *     description: Rút tiền từ balance ví về tài khoản ngân hàng. Hệ thống tự động chuyển qua PayOS Chi, không cần Admin duyệt. Nếu PayOS Chi thất bại, số dư sẽ được hoàn lại.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - account_number
 *               - account_name
 *               - bank_code
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 2000
 *                 maximum: 50000000
 *                 example: 50000
 *                 description: Số tiền rút (VND)
 *               account_number:
 *                 type: string
 *                 example: "1234567890"
 *                 description: Số tài khoản ngân hàng
 *               account_name:
 *                 type: string
 *                 example: "NGUYEN VAN A"
 *                 description: Tên chủ tài khoản (viết hoa, không dấu)
 *               bank_code:
 *                 type: string
 *                 example: "VCB"
 *                 description: "Mã ngân hàng (VCB, TCB, MB, BIDV, ACB, TPB...)"
 *     responses:
 *       201:
 *         description: Rút tiền thành công
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
 *                   example: "Rút tiền thành công! Tiền sẽ được chuyển vào tài khoản ngân hàng trong vài phút."
 *                 data:
 *                   type: object
 *                   properties:
 *                     transaction_id:
 *                       type: string
 *                       format: uuid
 *                     amount:
 *                       type: number
 *                       example: 50000
 *                     bank_info:
 *                       type: object
 *                       properties:
 *                         account_number:
 *                           type: string
 *                         account_name:
 *                           type: string
 *                         bank_code:
 *                           type: string
 *                     payout_status:
 *                       type: string
 *                       example: completed
 *       400:
 *         description: Số dư không đủ, thông tin bank thiếu, hoặc PayOS Chi thất bại
 *       401:
 *         description: Chưa xác thực
 */

/**
 * @swagger
 * /api/wallet/banks:
 *   get:
 *     summary: Danh sách ngân hàng (BIN code cho dropdown)
 *     description: Trả về danh sách ngân hàng hỗ trợ chuyển tiền kèm BIN code, logo. Dữ liệu được cache 24h từ VietQR API. Không cần đăng nhập.
 *     tags: [Wallet]
 *     responses:
 *       200:
 *         description: Lấy danh sách ngân hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       bin:
 *                         type: string
 *                         example: "970423"
 *                         description: Mã BIN (dùng cho bank_code khi rút tiền)
 *                       name:
 *                         type: string
 *                         example: "Ngân hàng TMCP Tiên Phong"
 *                       short_name:
 *                         type: string
 *                         example: "TPBank"
 *                       code:
 *                         type: string
 *                         example: "TPB"
 *                       logo:
 *                         type: string
 *                         example: "https://cdn.vietqr.io/img/TPB.png"
 */

module.exports = {};
