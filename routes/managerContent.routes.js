const express = require('express');
const router = express.Router();
const ManagerContentController = require('../controllers/manager/ContentController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { upload3DModel } = require('../config/supabase.config');

router.use(i18nMiddleware);

// ===================== MEDIA =====================

// POST - Upload 3D Model (Manager only)
router.post(
    '/media/3d-model',
    authMiddleware,
    authMiddleware.authorize('manager'),
    upload3DModel.single('file'),
    ManagerContentController.upload3DModel
);

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

// ===================== EVENTS =====================

// GET - Get all events
router.get(
    '/events',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.getEvents
);

// PATCH - Approve/Reject event
router.patch(
    '/events/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.updateEventStatus
);

// PATCH - Toggle event is_active (soft delete/restore)
router.patch(
    '/events/:id/is-active',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.toggleEventActive
);

// ===================== NEARBY PLACES =====================

// GET - Get all nearby places
router.get(
    '/nearby-places',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.getNearbyPlaces
);

// PATCH - Approve/Reject nearby place
router.patch(
    '/nearby-places/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.updateNearbyPlaceStatus
);

// PATCH - Toggle nearby place is_active (soft delete/restore)
router.patch(
    '/nearby-places/:id/is-active',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerContentController.toggleNearbyPlaceActive
);


module.exports = router;
