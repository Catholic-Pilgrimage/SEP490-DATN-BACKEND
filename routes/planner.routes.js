const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const PlannerValidator = require('../validators/planner.validator');
const authenticate = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Planners
 *   description: Lập kế hoạch hành hương
 */

/**
 * @swagger
 * /api/planners:
 *   post:
 *     summary: Tạo kế hoạch mới
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlannerRequest'
 *     responses:
 *       201:
 *         description: Tạo kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Lỗi xác thực
 *       401:
 *         description: Chưa xác thực
 */
router.post(
    '/',
    authenticate,
    PlannerValidator.createPlanner,
    PlannerController.createPlanner
);

/**
 * @swagger
 * /api/planners:
 *   get:
 *     summary: Lấy danh sách kế hoạch của người dùng
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Số mục trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerListResponse'
 *       401:
 *         description: Chưa xác thực
 */
router.get(
    '/',
    authenticate,
    PlannerValidator.getUserPlanners,
    PlannerController.getUserPlanners
);

/**
 * @swagger
 * /api/planners/{id}:
 *   get:
 *     summary: Lấy kế hoạch theo ID
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Lấy kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PlannerWithItems'
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.get(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerById
);

/**
 * @swagger
 * /api/planners/{id}:
 *   put:
 *     summary: Cập nhật kế hoạch (full update)
 *     description: Cập nhật nhiều trường của kế hoạch như tên, ngày, số người, phương tiện, ngân sách
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlannerRequest'
 *     responses:
 *       200:
 *         description: Cập nhật kế hoạch thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Lỗi xác thực
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.put(
    '/:id',
    authenticate,
    PlannerValidator.updatePlanner,
    PlannerController.updatePlanner
);

/**
 * @swagger
 * /api/planners/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái kế hoạch
 *     description: Cập nhật chỉ trạng thái của kế hoạch (planning, ongoing, completed)
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planning, ongoing, completed]
 *                 description: Trạng thái mới của kế hoạch
 *                 example: ongoing
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Lỗi xác thực
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.patch(
    '/:id/status',
    authenticate,
    PlannerValidator.updatePlannerStatus,
    PlannerController.updatePlannerStatus
);

/**
 * @swagger
 * /api/planners/{id}:
 *   delete:
 *     summary: Xóa kế hoạch
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Xóa kế hoạch thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.delete(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.deletePlanner
);

/**
 * @swagger
 * /api/planners/{id}/items:
 *   post:
 *     summary: Thêm điểm vào kế hoạch
 *     description: Thêm một địa điểm vào một ngày cụ thể trong kế hoạch. Kiểm tra khoảng cách áp dụng cho điểm thứ 2 trở đi trong cùng ngày.
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPlannerItemRequest'
 *     responses:
 *       201:
 *         description: Thêm điểm thành công (có thể bao gồm cảnh báo khoảng cách)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddItemResponse'
 *       400:
 *         description: Lỗi xác thực hoặc khoảng cách quá xa (>500km)
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch hoặc địa điểm
 */
router.post(
    '/:id/items',
    authenticate,
    PlannerValidator.addPlannerItem,
    PlannerController.addPlannerItem
);

/**
 * @swagger
 * /api/planners/{id}/items/reorder:
 *   patch:
 *     summary: Sắp xếp lại các địa điểm trong cùng một ngày
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderItemsRequest'
 *     responses:
 *       200:
 *         description: Items reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlannerItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner not found
 */
router.patch(
    '/:id/items/reorder',
    authenticate,
    PlannerValidator.reorderItems,
    PlannerController.reorderPlannerItems
);

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}:
 *   delete:
 *     summary: Xóa một địa điểm khỏi kế hoạch
 *     description: Xóa một địa điểm và tự động sắp xếp lại các địa điểm còn lại trong cùng ngày
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner or item not found
 */
router.delete(
    '/:id/items/:itemId',
    authenticate,
    PlannerValidator.deleteItem,
    PlannerController.deletePlannerItem
);

// ============================================
// SHARE TOKEN MANAGEMENT ROUTES (Owner only)
// ============================================

/**
 * @swagger
 * /api/planners/{id}/share-token:
 *   post:
 *     summary: Tạo hoặc cập nhật token chia sẻ
 *     description: Tạo token chia sẻ mới hoặc cập nhật role của token hiện tại. Chỉ chủ sở hữu mới có quyền.
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, editor]
 *                 default: viewer
 *                 description: Quyền của người được chia sẻ
 *     responses:
 *       200:
 *         description: Tạo/cập nhật token thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "abc123def456..."
 *                     role:
 *                       type: string
 *                       example: "editor"
 *                     link:
 *                       type: string
 *                       example: "myapp://planners/share/abc123def456..."
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.post(
    '/:id/share-token',
    authenticate,
    PlannerValidator.createShareToken,
    PlannerController.createShareToken
);

/**
 * @swagger
 * /api/planners/{id}/share:
 *   delete:
 *     summary: Tắt chia sẻ
 *     description: Vô hiệu hóa chia sẻ kế hoạch, xóa token và đặt lại về trạng thái riêng tư. Chỉ chủ sở hữu mới có quyền.
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID kế hoạch
 *     responses:
 *       200:
 *         description: Tắt chia sẻ thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền - không phải chủ sở hữu
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.delete(
    '/:id/share',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.disableShare
);

module.exports = router;
