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
 *     description: |
 *       Local Guide đề xuất địa điểm lân cận (ăn uống, lưu trú, y tế) gần site.
 *       `distance_meters` được tự động tính từ tọa độ của địa điểm lân cận và tọa độ của site.
 *     tags: [Local Guide - Nearby Places]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active (true = đang hoạt động, false = đã xóa)
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
 *         multipart/form-data:
 *           schema:
 *             type: object
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
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *               description:
 *                 type: string
 *                 example: "Nhà hàng phở truyền thống"
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

/**
 * @swagger
 * /api/local-guide/nearby-places/{id}/restore:
 *   patch:
 *     summary: Khôi phục địa điểm lân cận đã xóa (Local Guide only)
 *     description: |
 *       Khôi phục địa điểm lân cận đã bị soft delete (is_active: false).
 *       - Chỉ khôi phục được địa điểm pending hoặc rejected
 *       - Không thể khôi phục địa điểm đã approved
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
 *         description: ID của địa điểm lân cận cần khôi phục
 *     responses:
 *       200:
 *         description: Khôi phục thành công
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
 *                   example: "Nearby place restored successfully"
 *                 data:
 *                   $ref: '#/components/schemas/NearbyPlace'
 *       400:
 *         description: |
 *           - Không thể khôi phục địa điểm đã được duyệt
 *           - Địa điểm đã được kích hoạt
 *       404:
 *         description: Không tìm thấy địa điểm lân cận
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

module.exports = {};
