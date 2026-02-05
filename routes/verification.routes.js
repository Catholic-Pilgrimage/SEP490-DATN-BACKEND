const express = require('express');
const VerificationController = require('../controllers/VerificationController');
const VerificationValidator = require('../validators/verification.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { uploadDocument } = require('../config/cloudinary.config');

// Public Router (Guest registration)
const publicRouter = express.Router();
publicRouter.use(i18nMiddleware);

// POST - Guest submit verification request (no auth required)
publicRouter.post(
    '/guest-request',
    uploadDocument.single('certificate'),
    VerificationValidator.createGuestRequest,
    VerificationController.createGuestRequest
);

// POST - Submit transition request (guest or pilgrim)
publicRouter.post(
    '/transition',
    uploadDocument.single('certificate'),
    VerificationController.createTransitionRequest
);

// Pilgrim Router
const pilgrimRouter = express.Router();
pilgrimRouter.use(i18nMiddleware);

// POST - Submit verification request
pilgrimRouter.post(
    '/',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadDocument.single('certificate'),
    VerificationValidator.createRequest,
    VerificationController.createRequest
);

// POST - Submit transition request (authenticated pilgrim)
pilgrimRouter.post(
    '/transition',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadDocument.single('certificate'),
    VerificationController.createTransitionRequest
);

// GET - Get my verification request
pilgrimRouter.get(
    '/me',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    VerificationController.getMyRequest
);

// Admin Router
const adminRouter = express.Router();
adminRouter.use(i18nMiddleware);

// GET  - List all
adminRouter.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationController.getRequests
);

// GET  - Get detail
adminRouter.get(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationController.getRequestById
);

// PATCH - Update status (approve/reject)
adminRouter.patch(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationValidator.updateStatus,
    VerificationController.updateStatus
);

module.exports = {
    publicRouter,
    pilgrimRouter,
    adminRouter
};

