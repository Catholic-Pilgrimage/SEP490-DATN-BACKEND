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

module.exports = router;
