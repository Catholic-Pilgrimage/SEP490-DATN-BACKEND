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

router.get(
    '/:id/calendar-sync',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerCalendarController.getCalendarSync
);

router.get(
    '/:id/transactions',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerTransactions
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

// Xác nhận tham gia (tạo link thanh toán cọc)
router.post(
    '/:id/confirm-join',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.confirmJoin
);

// Webhook PayOS cho thanh toán cọc (public - không cần auth)
router.post(
    '/deposit-webhook',
    PilgrimPlannerShareController.handleDepositWebhook
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


router.get(
    '/:id/progress',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerProgress
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