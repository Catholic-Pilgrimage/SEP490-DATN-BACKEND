const express = require('express');
const router = express.Router();
const ManagerLocalGuideController = require('../controllers/ManagerLocalGuideController');
const ManagerLocalGuideValidator = require('../validators/managerLocalGuide.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// POST - Create Local Guide
router.post(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideValidator.createLocalGuide,
    ManagerLocalGuideController.createLocalGuide
);

// GET - List Local Guides
router.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.getLocalGuides
);

// ===================== SHIFT SUBMISSIONS =====================

// GET - Get site submissions
router.get(
    '/shift-submissions',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.getSubmissions
);

// GET - Get submission detail
router.get(
    '/shift-submissions/:id',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.getSubmissionDetail
);

// PATCH - Update Submission Status (approve/reject)
router.patch(
    '/shift-submissions/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.updateSubmissionStatus
);

// ===================== LOCAL GUIDE STATUS =====================

// PATCH - Update Local Guide Status (block/unblock)
router.patch(
    '/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideValidator.updateStatus,
    ManagerLocalGuideController.updateLocalGuideStatus
);

// DELETE - Remove Local Guide (ban + reject pending + deactivate shifts)
router.delete(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.removeLocalGuide
);

module.exports = router;

