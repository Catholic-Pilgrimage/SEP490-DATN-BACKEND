const express = require('express');
const router = express.Router();
const LocalGuideController = require('../controllers/LocalGuideController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { uploadMedia } = require('../config/cloudinary.config');
const LocalGuideValidator = require('../validators/localGuide.validator');
const { handleValidationErrors } = require('../utils/validation.util');

router.use(i18nMiddleware);

// GET  - Get my site details
router.get(
    '/site',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getMySite
);

// POST  - Upload media (file or YouTube URL)
router.post(
    '/media',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('file'),
    LocalGuideValidator.uploadMedia,
    handleValidationErrors,
    LocalGuideController.uploadMedia
);

// GET  - List site media
router.get(
    '/media',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSiteMedia
);

// DELETE  - Delete media (pending only)
router.delete(
    '/media/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateMediaId,
    handleValidationErrors,
    LocalGuideController.deleteMedia
);

// PUT  - Update media (pending only)
router.put(
    '/media/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('file'),
    LocalGuideValidator.validateMediaId,
    LocalGuideValidator.updateMedia,
    handleValidationErrors,
    LocalGuideController.updateMedia
);

// ========================
// MASS SCHEDULE ROUTES
// ========================

// POST  - Create schedule
router.post(
    '/schedules',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.createSchedule,
    handleValidationErrors,
    LocalGuideController.createSchedule
);

// GET - Get MY schedules
router.get(
    '/schedules',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSchedules
);

// PUT  - Update schedule (own + pending/rejected)
router.put(
    '/schedules/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateScheduleId,
    LocalGuideValidator.updateSchedule,
    handleValidationErrors,
    LocalGuideController.updateSchedule
);

// DELETE  - Delete schedule (own + pending/rejected)
router.delete(
    '/schedules/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateScheduleId,
    handleValidationErrors,
    LocalGuideController.deleteSchedule
);

// ========================
// EVENT ROUTES
// ========================

// POST - Create event
router.post(
    '/events',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('banner'),
    LocalGuideValidator.createEvent,
    handleValidationErrors,
    LocalGuideController.createEvent
);

// GET - Get MY events
router.get(
    '/events',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getEvents
);

// PUT - Update event (own + pending/rejected)
router.put(
    '/events/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('banner'),
    LocalGuideValidator.validateEventId,
    LocalGuideValidator.updateEvent,
    handleValidationErrors,
    LocalGuideController.updateEvent
);

// DELETE - Delete event (own + pending/rejected)
router.delete(
    '/events/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateEventId,
    handleValidationErrors,
    LocalGuideController.deleteEvent
);

// ========================
// SHIFT SUBMISSION ROUTES
// ========================

// POST - Create shift submission
router.post(
    '/shift-submissions',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.createSubmission
);

// GET - Get my submissions
router.get(
    '/shift-submissions',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSubmissions
);

// GET - Get submission detail
router.get(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSubmissionDetail
);

// PUT - Update submission (pending/rejected only) - full replacement
router.put(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.updateSubmission
);

// DELETE - Delete submission (pending only)
router.delete(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.deleteSubmission
);

// GET - Get site schedule (calendar view)
router.get(
    '/site-schedule',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSiteSchedule
);

// ===================== NEARBY PLACES =====================

// POST - Create nearby place
router.post(
    '/nearby-places',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.createNearbyPlace,
    LocalGuideController.createNearbyPlace
);

// GET - Get my nearby places
router.get(
    '/nearby-places',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getNearbyPlaces
);

// PUT - Update nearby place
router.put(
    '/nearby-places/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.updateNearbyPlace,
    LocalGuideController.updateNearbyPlace
);

// DELETE - Delete nearby place
router.delete(
    '/nearby-places/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.deleteNearbyPlace
);


module.exports = router;
