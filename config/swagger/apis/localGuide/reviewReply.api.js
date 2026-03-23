/**
 * @swagger
 * tags:
 *   name: Review Replies - Local Guide
 *   description: Phản hồi đánh giá (Local Guide only)
 */

/**
 * @swagger
 * /api/local-guide/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá của site được gán (auto-scope)
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, site, nearby_place]
 *           default: all
 *         description: Lọc theo loại review
 *       - in: query
 *         name: has_reply
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Lọc review đã/chưa có phản hồi
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
 *                     site_reviews:
 *                       type: object
 *                       properties:
 *                         summary:
 *                           $ref: '#/components/schemas/ReviewSummary'
 *                         reviews:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/SiteReview'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *                     nearby_place_reviews:
 *                       type: object
 *                       properties:
 *                         reviews:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/NearbyPlaceReview'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       403:
 *         description: Không được gán cho site nào
 */

/**
 * @swagger
 * /api/local-guide/site-reviews/{reviewId}/reply:
 *   post:
 *     summary: Phản hồi đánh giá địa điểm
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của đánh giá cần phản hồi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 description: Nội dung phản hồi
 *                 example: "Cảm ơn bạn đã ghé thăm! Rất vui vì bạn có trải nghiệm tốt."
 *     responses:
 *       201:
 *         description: Phản hồi thành công
 *       403:
 *         description: Không có quyền (không phải Local Guide/Manager của địa điểm này)
 *       404:
 *         description: Không tìm thấy đánh giá
 *       409:
 *         description: Đánh giá đã có phản hồi rồi
 *
 *   put:
 *     summary: Cập nhật phản hồi đánh giá địa điểm
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Cập nhật phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 *
 *   delete:
 *     summary: Xóa phản hồi đánh giá địa điểm
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 */

/**
 * @swagger
 * /api/local-guide/nearby-place-reviews/{reviewId}/reply:
 *   post:
 *     summary: Phản hồi đánh giá địa điểm lân cận
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của đánh giá cần phản hồi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "Cảm ơn bạn đã đánh giá! Chúng tôi sẽ cải thiện dịch vụ."
 *     responses:
 *       201:
 *         description: Phản hồi thành công
 *       403:
 *         description: Không có quyền
 *       409:
 *         description: Đã có phản hồi
 *
 *   put:
 *     summary: Cập nhật phản hồi đánh giá địa điểm lân cận
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: Cập nhật phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 *
 *   delete:
 *     summary: Xóa phản hồi đánh giá địa điểm lân cận
 *     tags: [Review Replies - Local Guide]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa phản hồi thành công
 *       404:
 *         description: Không tìm thấy phản hồi
 */

module.exports = {};
