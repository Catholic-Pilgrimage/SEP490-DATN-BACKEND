const express = require('express');

// Import split controllers by role
const { PilgrimVerificationController } = require('../controllers/pilgrim');
const { AdminVerificationController } = require('../controllers/admin');

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
    PilgrimVerificationController.createGuestRequest
);

// POST - Submit transition request (guest or pilgrim, no auth)
publicRouter.post(
    '/transition',
    uploadDocument.single('certificate'),
    VerificationValidator.createTransitionRequestGuest,
    PilgrimVerificationController.createTransitionRequest
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
    PilgrimVerificationController.createRequest
);

// POST - Submit transition request (authenticated pilgrim)
pilgrimRouter.post(
    '/transition',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadDocument.single('certificate'),
    VerificationValidator.createTransitionRequestPilgrim,
    PilgrimVerificationController.createTransitionRequest
);

// GET - Get my verification request
pilgrimRouter.get(
    '/me',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    PilgrimVerificationController.getMyRequest
);

// Admin Router
const adminRouter = express.Router();
adminRouter.use(i18nMiddleware);

// GET  - List all
adminRouter.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('admin'),
    AdminVerificationController.getRequests
);

// GET  - Get detail
adminRouter.get(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    AdminVerificationController.getRequestById
);

// PATCH - Update status (approve/reject)
adminRouter.patch(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationValidator.updateStatus,
    AdminVerificationController.updateStatus
);

module.exports = {
    publicRouter,
    pilgrimRouter,
    adminRouter
};
