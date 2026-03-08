const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const PlannerValidator = require('../validators/planner.validator');
const authenticate = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Planners - Pilgrim
 *   description: Lập kế hoạch hành hương
 */

/**
 * @swagger
 * /api/planners:
 *   post:
 *     summary: Tạo kế hoạch mới
 *     tags: [Planners - Pilgrim]
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
 *     tags: [Planners - Pilgrim]
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
 *     tags: [Planners - Pilgrim]
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
 *     summary: Cập nhật kế hoạch
 *     description: Cập nhật nhiều trường của kế hoạch như tên, ngày, số người, phương tiện, ngân sách
 *     tags: [Planners - Pilgrim]
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
 *   patch:
 *     summary: Cập nhật một phần kế hoạch
 *     description: Cập nhật một hoặc nhiều trường của kế hoạch (partial update)
 *     tags: [Planners - Pilgrim]
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

// PATCH method for partial updates (same handler as PUT)
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
 *     tags: [Planners - Pilgrim]
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
 *     tags: [Planners - Pilgrim]
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
 *     tags: [Planners - Pilgrim]
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
 *     tags: [Planners - Pilgrim]
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

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}:
 *   put:
 *     summary: Cập nhật một điểm trong kế hoạch
 *     description: Cập nhật giờ dự kiến, thời gian nghỉ, ghi chú của một địa điểm. Lưu ý - estimated_time chỉ có thể cập nhật cho điểm đầu tiên trong ngày.
 *     tags: [Planners - Pilgrim]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estimated_time:
 *                 type: string
 *                 description: Giờ dự kiến đến (chỉ cho điểm đầu tiên trong ngày)
 *                 example: "09:30"
 *               rest_duration:
 *                 type: string
 *                 description: Thời gian nghỉ ngơi tại địa điểm (tối thiểu 1 tiếng)
 *                 example: "2 hours"
 *               note:
 *                 type: string
 *                 description: Ghi chú
 *                 example: "Nhớ mang theo ô"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerItem'
 *       400:
 *         description: Lỗi xác thực hoặc không thể cập nhật estimated_time cho điểm không phải đầu tiên
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner or item not found
 */
router.put(
    '/:id/items/:itemId',
    authenticate,
    PlannerValidator.updatePlannerItem,
    PlannerController.updatePlannerItem
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
 *     tags: [Planners - Pilgrim]
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
 *             properties: {}
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
 *                       example: "viewer"
 *                     link:
 *                       type: string
 *                       example: "myapp://planners/share/abc123def456..."
 *                     qr_code:
 *                       type: string
 *                       description: QR code as base64 data URL
 *                       example: "data:image/png;base64,..."
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
 *     tags: [Planners - Pilgrim]
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

/**
 * @swagger
 * /api/planners/{id}/complete:
 *   post:
 *     summary: Đánh dấu kế hoạch hoàn thành
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của kế hoạch
 *     responses:
 *       200:
 *         description: Đánh dấu hoàn thành thành công
 *       400:
 *         description: Kế hoạch không ở trạng thái ongoing
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy kế hoạch
 */
router.post(
    '/:id/complete',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.completePlanner
);

/**
 * @swagger
 * /api/planners/{id}/invite:
 *   post:
 *     summary: Mời người tham gia kế hoạch qua email
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Gửi lời mời thành công (kèm QR code)
 */
router.post(
    '/:id/invite',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.inviteUser
);

/**
 * @swagger
 * /api/planners/invite/{token}:
 *   post:
 *     summary: Phản hồi lời mời tham gia kế hoạch
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Hành động (accept = chấp nhận, reject = từ chối)
 *     responses:
 *       200:
 *         description: Xử lý lời mời thành công
 */
router.post(
    '/invite/:token',
    authenticate,
    PlannerController.respondToInvite
);

/**
 * @swagger
 * /api/planners/{id}/invites:
 *   get:
 *     summary: Lấy danh sách lời mời của kế hoạch
 *     tags: [Planners - Pilgrim]
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
 *         description: Lấy danh sách thành công
 */
router.get(
    '/:id/invites',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getInvites
);

/**
 * @swagger
 * /api/planners/{id}/members:
 *   get:
 *     summary: Lấy danh sách thành viên của kế hoạch
 *     tags: [Planners - Pilgrim]
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
 *         description: Lấy danh sách thành công
 */
router.get(
    '/:id/members',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getMembers
);

/**
 * @swagger
 * /api/planners/{id}/members/{memberId}:
 *   delete:
 *     summary: Xóa thành viên khỏi kế hoạch
 *     tags: [Planners - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 */
router.delete(
    '/:id/members/:memberId',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.removeMember
);

module.exports = router;
