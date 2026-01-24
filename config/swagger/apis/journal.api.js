/**
 * @swagger
 * /api/journals:
 *   post:
 *     tags: [Journals]
 *     summary: Tạo nhật ký mới
 *     description: Tạo nhật ký với tiêu đề, nội dung, ảnh (tối đa 10), audio, video và liên kết địa điểm
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateJournalRequest'
 *     responses:
 *       201:
 *         description: Tạo nhật ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalResponse'
 *       400:
 *         description: Lỗi validation hoặc vượt quá số ảnh cho phép
 *       401:
 *         description: Chưa xác thực
 *
 * /api/journals/me:
 *   get:
 *     tags: [Journals]
 *     summary: Lấy nhật ký của tôi
 *     description: Lấy tất cả nhật ký (riêng tư và công khai) của người dùng đã đăng nhập
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách nhật ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalListResponse'
 *       401:
 *         description: Chưa xác thực
 *
 * /api/journals/public:
 *   get:
 *     tags: [Journals]
 *     summary: Lấy nhật ký công khai
 *     description: Lấy tất cả nhật ký công khai với các bộ lọc tùy chọn
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: site_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo ID địa điểm
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Tìm kiếm trong tiêu đề và nội dung
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-01-17"
 *         description: Lọc theo ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lấy danh sách nhật ký công khai thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalListResponse'
 *
 * /api/journals/{id}:
 *   get:
 *     tags: [Journals]
 *     summary: Lấy nhật ký theo ID
 *     description: Lấy một nhật ký cụ thể. Nhật ký công khai ai cũng xem được, nhật ký riêng tư chỉ chủ sở hữu mới xem được
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID nhật ký
 *     responses:
 *       200:
 *         description: Lấy nhật ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalResponse'
 *       403:
 *         description: Không có quyền - Nhật ký riêng tư, không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy nhật ký
 *
 *   patch:
 *     tags: [Journals]
 *     summary: Cập nhật nhật ký
 *     description: Cập nhật nhật ký (chỉ chủ sở hữu). Tất cả các trường đều tùy chọn
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID nhật ký
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJournalRequest'
 *     responses:
 *       200:
 *         description: Cập nhật nhật ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JournalResponse'
 *       400:
 *         description: Lỗi validation hoặc vượt quá số ảnh cho phép
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - Không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy nhật ký
 *
 *   delete:
 *     tags: [Journals]
 *     summary: Xóa nhật ký
 *     description: Xóa nhật ký (chỉ chủ sở hữu)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID nhật ký
 *     responses:
 *       200:
 *         description: Xóa nhật ký thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - Không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy nhật ký
 */

module.exports = {};
