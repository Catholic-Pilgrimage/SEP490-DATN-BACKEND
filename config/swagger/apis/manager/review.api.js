/**
 * @swagger
 * tags:
 *   name: Reviews - Manager
 *   description: Quản lý đánh giá (Manager only)
 */

/**
 * @swagger
 * /api/manager/reviews:
 *   get:
 *     summary: Lấy danh sách đánh giá của site được gán (Manager)
 *     tags: [Reviews - Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, site]
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
 *                           type: object
 *                           properties:
 *                             avg_rating:
 *                               type: number
 *                             total_reviews:
 *                               type: integer
 *                         reviews:
 *                           type: array
 *                           items:
 *                             type: object
 *                         pagination:
 *                           type: object

 *       403:
 *         description: Không được gán cho site nào
 */

module.exports = {};
