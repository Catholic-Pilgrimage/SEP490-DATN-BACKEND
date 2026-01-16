const express = require('express');
const router = express.Router();
const ManagerContentController = require('../controllers/ManagerContentController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// GET  - Get all media
router.get(
    '/media',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.getMedia
);

// PATCH - Approve/Reject
router.patch(
    '/media/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.updateMediaStatus
);

// PATCH - Toggle is_active (soft delete/restore)
router.patch(
    '/media/:id/is-active',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.toggleMediaActive
);

// ===================== SCHEDULES =====================

// GET - Get all schedules
router.get(
    '/schedules',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.getSchedules
);

// PATCH - Approve/Reject schedule
router.patch(
    '/schedules/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.updateScheduleStatus
);

// PATCH - Toggle schedule is_active (soft delete/restore)
router.patch(
    '/schedules/:id/is-active',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.toggleScheduleActive
);


module.exports = router;
