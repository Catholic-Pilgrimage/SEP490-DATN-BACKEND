const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const { PilgrimPlannerShareController } = require('../controllers/pilgrim');
const PlannerValidator = require('../validators/planner.validator');
const authenticate = require('../middlewares/auth.middleware');


router.post(
    '/',
    authenticate,
    PlannerValidator.createPlanner,
    PlannerController.createPlanner
);

router.get(
    '/',
    authenticate,
    PlannerValidator.getUserPlanners,
    PlannerController.getUserPlanners
);

router.get(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerById
);

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

router.delete(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.deletePlanner
);

router.post(
    '/:id/items',
    authenticate,
    PlannerValidator.addPlannerItem,
    PlannerController.addPlannerItem
);

router.patch(
    '/:id/items/reorder',
    authenticate,
    PlannerValidator.reorderItems,
    PlannerController.reorderPlannerItems
);

router.delete(
    '/:id/items/:itemId',
    authenticate,
    PlannerValidator.deleteItem,
    PlannerController.deletePlannerItem
);

router.put(
    '/:id/items/:itemId',
    authenticate,
    PlannerValidator.updatePlannerItem,
    PlannerController.updatePlannerItem
);


// PATCH /:id/status - Update planner status (unified endpoint for start/complete)
router.patch(
    '/:id/status',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.updatePlannerStatus
);

router.post(
    '/:id/items/:itemId/checkin',
    authenticate,
    PlannerController.checkinItem
);

router.post(
    '/:id/items/:itemId/skip',
    authenticate,
    PlannerController.skipItem
);

router.post(
    '/:id/invite',
    authenticate,
    PlannerValidator.inviteUser,
    PilgrimPlannerShareController.inviteUser
);

router.post(
    '/invite/:token',
    authenticate,
    PlannerValidator.respondToInvite,
    PilgrimPlannerShareController.respondToInvite
);

router.get(
    '/:id/invites',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.getInvites
);

router.get(
    '/:id/members',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.getMembers
);

router.delete(
    '/:id/members/:memberId',
    authenticate,
    PlannerValidator.removeMember,
    PilgrimPlannerShareController.removeMember
);

/**
 * @swagger
 * /api/planners/{id}/progress:
 *   get:
 *     summary: Lấy tiến độ của tất cả thành viên trong planner
 *     description: |
 *       Trả về thông tin tiến độ check-in của tất cả thành viên.
 *       Chỉ owner hoặc member mới xem được.
 *     tags: [Planner - Pilgrim]
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
 *         description: Thông tin tiến độ
 */
router.get(
    '/:id/progress',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerProgress
);

module.exports = router;
