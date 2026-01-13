const express = require('express');
const VerificationController = require('../controllers/VerificationController');
const VerificationValidator = require('../validators/verification.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { uploadDocument } = require('../config/cloudinary.config');

// ============================================
// PILGRIM ROUTES - /api/verification-requests
// ============================================
const pilgrimRouter = express.Router();
pilgrimRouter.use(i18nMiddleware);

// POST /api/verification-requests - Submit verification request
pilgrimRouter.post(
    '/',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    uploadDocument.single('certificate'),
    VerificationValidator.createRequest,
    VerificationController.createRequest
);

// GET /api/verification-requests/me - Get my verification request
pilgrimRouter.get(
    '/me',
    authMiddleware,
    authMiddleware.authorize('pilgrim'),
    VerificationController.getMyRequest
);

// ============================================
// ADMIN ROUTES - /api/admin/verification-requests
// ============================================
const adminRouter = express.Router();
adminRouter.use(i18nMiddleware);

// GET /api/admin/verification-requests - List all
adminRouter.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationController.getRequests
);

// GET /api/admin/verification-requests/:id - Get detail
adminRouter.get(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationController.getRequestById
);

// PATCH /api/admin/verification-requests/:id - Update status (approve/reject)
adminRouter.patch(
    '/:id',
    authMiddleware,
    authMiddleware.authorize('admin'),
    VerificationValidator.updateStatus,
    VerificationController.updateStatus
);

module.exports = {
    pilgrimRouter,
    adminRouter
};
