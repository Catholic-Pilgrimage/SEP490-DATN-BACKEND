/**
 * @swagger
 * tags:
 *   - name: Local Guide - Nearby Places
 *     description: API quản lý địa điểm lân cận
 */

/**
 * @swagger
 * /api/local-guide/nearby-places:
 *   post:
 *     summary: Tạo địa điểm lân cận mới (Local Guide only)
 *     description: Local Guide đề xuất địa điểm lân cận (ăn uống, lưu trú, y tế) gần site
 *     tags: [Local Guide - Nearby Places]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - latitude
 *               - longitude
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nhà hàng Phở 24"
 *               category:
 *                 type: string
 *                 enum: [food, lodging, medical]
 *                 example: "food"
 *               address:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 10.779738
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 106.699092
 *               distance_meters:
 *                 type: integer
 *                 example: 500
 *                 description: Khoảng cách từ site (mét)
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               description:
 *                 type: string
 *                 example: "Nhà hàng phở truyền thống, giá cả phải chăng"
 *     responses:
 *       201:
 *         description: Tạo địa điểm lân cận thành công
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
 *                   $ref: '#/components/schemas/NearbyPlace'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 *
 *   get:
 *     summary: Xem danh sách địa điểm lân cận của tôi (Local Guide only)
 *     description: Lấy danh sách địa điểm lân cận do Local Guide đề xuất
 *     tags: [Local Guide - Nearby Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, lodging, medical]
 *         description: Lọc theo danh mục
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
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
 *                     $ref: '#/components/schemas/NearbyPlace'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/nearby-places/{id}:
 *   put:
 *     summary: Cập nhật địa điểm lân cận (Local Guide only)
 *     description: Chỉ cập nhật được địa điểm pending hoặc rejected
 *     tags: [Local Guide - Nearby Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm lân cận
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [food, lodging, medical]
 *               address:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               distance_meters:
 *                 type: integer
 *               phone:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/NearbyPlace'
 *       400:
 *         description: Không thể cập nhật địa điểm đã được duyệt
 *       404:
 *         description: Không tìm thấy địa điểm
 *
 *   delete:
 *     summary: Xóa địa điểm lân cận (Local Guide only)
 *     description: Chỉ xóa được địa điểm pending hoặc rejected
 *     tags: [Local Guide - Nearby Places]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Không thể xóa địa điểm đã được duyệt
 *       404:
 *         description: Không tìm thấy địa điểm
 */

module.exports = {};
