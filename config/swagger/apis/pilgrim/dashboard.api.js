/**
 * @swagger
 * /api/pilgrim/dashboard/overview:
 *   get:
 *     summary: Lấy tổng quan dashboard người hành hương
 *     description: Lấy thông tin tổng quan hành trình, kế hoạch hiện tại, hoạt động gần đây và thống kê cho người hành hương
 *     tags: [Pilgrim - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê hành trình thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PilgrimDashboardOverview'
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê hành trình thành công"
 *       500:
 *         description: Lỗi máy chủ
 */

module.exports = {};
