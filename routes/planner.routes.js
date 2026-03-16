const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const { 
    PilgrimPlannerShareController, 
    PilgrimPlannerCalendarController,
    PilgrimPlannerOfflineController,
    PilgrimOfflineSyncController 
} = require('../controllers/pilgrim');
const PlannerValidator = require('../validators/planner.validator');
const OfflineValidator = require('../validators/offline.validator');
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

router.get(
    '/:id/calendar-sync',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerCalendarController.getCalendarSync
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

// Offline Mode Routes
router.get(
    '/:id/offline-data',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerOfflineController.getOfflineData
);

router.post(
    '/sync/offline-actions',
    authenticate,
    OfflineValidator.syncActions,
    PilgrimOfflineSyncController.syncActions
);

module.exports = router;
