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


router.post(
    '/:id/complete',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.completePlanner
);

router.post(
    '/:id/invite',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.inviteUser
);

router.post(
    '/invite/:token',
    authenticate,
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
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.removeMember
);

module.exports = router;
