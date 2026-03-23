const express = require('express');
const router = express.Router();
const LocalGuideController = require('../controllers/localGuide');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { uploadMedia, uploadNarrativeAudio } = require('../config/cloudinary.config');
const LocalGuideValidator = require('../validators/localGuide.validator');
const ReviewValidator = require('../validators/review.validator');
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

// GET - Get available TTS voices
router.get(
    '/media/voices',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getVoices
);

// GET - Get ALL approved site media (for viewing & selecting for narratives)
router.get(
    '/site-media',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getAllSiteMedia
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

// PATCH - Restore media
router.patch(
    '/media/:id/restore',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateMediaId,
    handleValidationErrors,
    LocalGuideController.restoreMedia
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

// PUT - Update narrative for 3D Model (audio or text-to-speech)
router.put(
    '/media/:id/narrative',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadNarrativeAudio.single('audio_file'),
    LocalGuideController.updateNarrative
);

// DELETE - Delete narrative for 3D Model
router.delete(
    '/media/:id/narrative',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.deleteNarrative
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

// PATCH - Restore schedule
router.patch(
    '/schedules/:id/restore',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateScheduleId,
    handleValidationErrors,
    LocalGuideController.restoreSchedule
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

// PATCH - Restore event
router.patch(
    '/events/:id/restore',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateEventId,
    handleValidationErrors,
    LocalGuideController.restoreEvent
);

// ========================
// SHIFT SUBMISSION ROUTES
// ========================

// POST - Create shift submission
router.post(
    '/shift-submissions',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.createShiftSubmission,
    handleValidationErrors,
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
    LocalGuideValidator.validateShiftSubmissionId,
    handleValidationErrors,
    LocalGuideController.getSubmissionDetail
);

// PUT - Update submission (pending/rejected only) - full replacement
router.put(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateShiftSubmissionId,
    LocalGuideValidator.updateShiftSubmission,
    handleValidationErrors,
    LocalGuideController.updateSubmission
);

// DELETE - Delete submission (pending only)
router.delete(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideValidator.validateShiftSubmissionId,
    handleValidationErrors,
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
    uploadMedia.none(),
    LocalGuideValidator.createNearbyPlace,
    handleValidationErrors,
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
    uploadMedia.none(),
    LocalGuideValidator.updateNearbyPlace,
    handleValidationErrors,
    LocalGuideController.updateNearbyPlace
);

// DELETE - Delete nearby place
router.delete(
    '/nearby-places/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.deleteNearbyPlace
);

// PATCH - Restore nearby place
router.patch(
    '/nearby-places/:id/restore',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.restoreNearbyPlace
);


// ===================== REVIEW MANAGEMENT =====================

// GET /api/local-guide/reviews - Get all reviews for my site
router.get(
    '/reviews',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getReviewsForMySite
);

// ===================== REVIEW REPLIES =====================

// POST /api/local-guide/site-reviews/:reviewId/reply
router.post(
    '/site-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    ReviewValidator.reply,
    handleValidationErrors,
    LocalGuideController.replySiteReview
);

// PUT /api/local-guide/site-reviews/:reviewId/reply
router.put(
    '/site-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    ReviewValidator.reply,
    handleValidationErrors,
    LocalGuideController.updateSiteReviewReply
);

// DELETE /api/local-guide/site-reviews/:reviewId/reply
router.delete(
    '/site-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    handleValidationErrors,
    LocalGuideController.deleteSiteReviewReply
);

// POST /api/local-guide/nearby-place-reviews/:reviewId/reply
router.post(
    '/nearby-place-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    ReviewValidator.reply,
    handleValidationErrors,
    LocalGuideController.replyNearbyPlaceReview
);

// PUT /api/local-guide/nearby-place-reviews/:reviewId/reply
router.put(
    '/nearby-place-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    ReviewValidator.reply,
    handleValidationErrors,
    LocalGuideController.updateNearbyPlaceReviewReply
);

// DELETE /api/local-guide/nearby-place-reviews/:reviewId/reply
router.delete(
    '/nearby-place-reviews/:reviewId/reply',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    ReviewValidator.validateReviewId,
    handleValidationErrors,
    LocalGuideController.deleteNearbyPlaceReviewReply
);


module.exports = router;
