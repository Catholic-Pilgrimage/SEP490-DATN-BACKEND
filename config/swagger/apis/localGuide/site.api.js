/**
 * @swagger
 * /api/local-guide/site:
 *   get:
 *     summary: Xem thông tin site được gán (Local Guide only)
 *     description: Local Guide xem thông tin chi tiết site mà mình được gán
 *     tags: [Local Guide - Site]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin site thành công
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                       example: "CHNAM001"
 *                     name:
 *                       type: string
 *                       example: "Nhà thờ Đức Bà Sài Gòn"
 *                     description:
 *                       type: string
 *                     history:
 *                       type: string
 *                     address:
 *                       type: string
 *                     province:
 *                       type: string
 *                     district:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     region:
 *                       type: string
 *                       enum: [Bac, Trung, Nam]
 *                     type:
 *                       type: string
 *                       enum: [church, shrine, monastery, center, other]
 *                     patron_saint:
 *                       type: string
 *                     cover_image:
 *                       type: string
 *                     opening_hours:
 *                       type: object
 *                     contact_info:
 *                       type: object
 *                     is_active:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *       404:
 *         description: Local Guide chưa được gán site
 */
