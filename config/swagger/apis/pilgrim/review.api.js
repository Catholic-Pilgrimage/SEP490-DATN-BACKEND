/**
 * @swagger
 * tags:
 *   name: Reviews - Pilgrim
 *   description: Đánh giá địa điểm (Pilgrim)
 */

/**
 * @swagger
 * /api/sites/{siteId}/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá của địa điểm (Public)
 *     tags: [Reviews - Pilgrim]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest, lowest]
 *           default: newest
 *     responses:
 *       200:
 *         description: Lấy danh sách đánh giá thành công
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
 *                     summary:
 *                       $ref: '#/components/schemas/ReviewSummary'
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SiteReview'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *
 *   post:
 *     summary: Tạo đánh giá cho địa điểm (Pilgrim only)
 *     tags: [Reviews - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Số sao đánh giá (1-5)
 *                 example: 5
 *               feedback:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Nội dung đánh giá
 *                 example: "Địa điểm rất đẹp và trang nghiêm"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Tối đa 5 ảnh (jpg, png, jpeg, webp), mỗi ảnh max 10MB
 *     responses:
 *       201:
 *         description: Tạo đánh giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chưa check-in tại địa điểm này
 *       409:
 *         description: Đã có đánh giá cho địa điểm này
 */

/**
 * @swagger
 * /api/sites/{siteId}/reviews/{reviewId}:
 *   put:
 *     summary: Cập nhật đánh giá của tôi
 *     tags: [Reviews - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *                 maxLength: 5000
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Cập nhật đánh giá thành công
 *       404:
 *         description: Không tìm thấy đánh giá
 *
 *   delete:
 *     summary: Xóa đánh giá của tôi
 *     tags: [Reviews - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa đánh giá thành công
 *       404:
 *         description: Không tìm thấy đánh giá
 */



module.exports = {};
