const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const PlannerValidator = require('../validators/planner.validator');
const authenticate = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Planners
 *   description: Quản lý kế hoạch du lịch
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
 *   patch:
 *     summary: Cập nhật kế hoạch
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
router.patch(
    '/:id',
    authenticate,
    PlannerValidator.updatePlanner,
    PlannerController.updatePlanner
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
 *     summary: Reorder items within a day
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
 *     summary: Delete item from planner
 *     description: Delete an item and automatically reorder remaining items in the same day
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

module.exports = router;
