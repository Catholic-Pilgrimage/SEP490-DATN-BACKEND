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
const CheckinUploadValidator = require('../validators/checkin-upload.validator');
const authenticate = require('../middlewares/auth.middleware');
const CheckinController = require('../controllers/CheckinController');
const { uploadCheckinPhoto } = require('../config/cloudinary.config');


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
    '/my-invites',
    authenticate,
    PilgrimPlannerShareController.getMyInvites
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
    '/:id/items',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.clearPlannerItems
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


// PATCH /:id/items/swap - Swap two planner items (same-day or cross-day)
router.patch(
    '/:id/items/swap',
    authenticate,
    PlannerValidator.swapPlannerItems,
    PlannerController.swapPlannerItems
);

// PATCH /:id/status - Update planner status (unified endpoint for start/complete)
router.patch(
    '/:id/status',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.updatePlannerStatus
);

router.post(
    '/:id/days/:dayNumber/close',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.closePlannerDay
);

router.patch(
    '/:id/lock',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.toggleLock
);

router.post(
    '/:id/items/:itemId/checkin',
    authenticate,
    uploadCheckinPhoto.single('photo'),
    CheckinUploadValidator.checkin,
    CheckinController.checkin
);

// [Trưởng đoàn] Cập nhật trạng thái điểm đến (Chốt sổ hoặc Bỏ qua)
router.patch(
    '/:id/items/:itemId/status',
    authenticate,
    CheckinController.updateItemStatus
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

// Friend invite (no deposit)
router.post(
    '/:id/invite-friend',
    authenticate,
    PlannerValidator.inviteFriend,
    PilgrimPlannerShareController.inviteFriend
);

router.post(
    '/invite/:token',
    authenticate,
    PlannerValidator.respondToInvite,
    PilgrimPlannerShareController.respondToInvite
);


// Huỷ / đặt lại thanh toán cọc đang chờ
router.post(
    '/:id/cancel-deposit',
    authenticate,
    PlannerValidator.validatePlannerId,
    PilgrimPlannerShareController.cancelDeposit
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

router.post(
    '/:id/share',
    authenticate,
    PlannerValidator.sharePlanner,
    PlannerController.shareToPost
);

router.post(
    '/:id/clone',
    authenticate,
    PlannerValidator.clonePlanner,
    PlannerController.cloneSharedPlanner
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
