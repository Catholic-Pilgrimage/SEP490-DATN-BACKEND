/**
 * @swagger
 * /api/local-guide/dashboard/overview:
 *   get:
 *     summary: Lấy tổng quan dashboard hướng dẫn viên
 *     description: Lấy thống kê cá nhân, đóng góp nội dung và tổng quan địa điểm cho hướng dẫn viên địa phương
 *     tags: [Local Guide - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thống kê dashboard thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/LocalGuideDashboardOverview'
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê dashboard thành công"
 *       403:
 *         description: Hướng dẫn viên chưa được gán vào địa điểm nào
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Hướng dẫn viên chưa được gán vào địa điểm nào"
 *       500:
 *         description: Lỗi máy chủ
 */

module.exports = {};
