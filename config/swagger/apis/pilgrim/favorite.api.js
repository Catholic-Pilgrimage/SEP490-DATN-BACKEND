/**
 * @swagger
 * /api/sites/favorites:
 *   get:
 *     summary: Lấy danh sách địa điểm yêu thích
 *     tags: [Pilgrim - Favorites]
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
 *         description: Lấy danh sách yêu thích thành công
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
 *                   example: "Lấy danh sách yêu thích thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     sites:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           code:
 *                             type: string
 *                           province:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           cover_image:
 *                             type: string
 *                           favorited_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/sites/{id}/favorite:
 *   post:
 *     summary: Thêm địa điểm vào danh sách yêu thích
 *     tags: [Pilgrim - Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     responses:
 *       200:
 *         description: Thêm vào yêu thích thành công
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
 *                   example: "Thêm vào yêu thích thành công"
 *       404:
 *         description: Không tìm thấy địa điểm
 *       409:
 *         description: Địa điểm đã có trong danh sách yêu thích
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/sites/{id}/favorite:
 *   delete:
 *     summary: Xóa địa điểm khỏi danh sách yêu thích
 *     tags: [Pilgrim - Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *     responses:
 *       200:
 *         description: Xóa khỏi yêu thích thành công
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
 *                   example: "Xóa khỏi yêu thích thành công"
 *       404:
 *         description: Không tìm thấy địa điểm
 *       400:
 *         description: Địa điểm không có trong danh sách yêu thích
 *       401:
 *         description: Unauthorized
 */

module.exports = {};
