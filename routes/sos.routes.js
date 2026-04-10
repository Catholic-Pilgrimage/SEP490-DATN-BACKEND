const express = require('express');
const router = express.Router();

// Import split controllers by role
const { PilgrimSOSController } = require('../controllers/pilgrim');
const { LocalGuideSOSController } = require('../controllers/localGuide');
const { ManagerSOSController } = require('../controllers/manager');
const { AdminSOSController } = require('../controllers/admin');

const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

/**
 * SOS Routes - All roles
 * Base path: /api/sos
 */

// Apply i18n middleware
router.use(i18nMiddleware);

// ===================== PILGRIM APIs =====================

// POST - Create SOS request
router.post('/', authMiddleware, PilgrimSOSController.createSOS);

// GET - Get my SOS requests
router.get('/', authMiddleware, PilgrimSOSController.getMySOS);

// GET - Get SOS detail (pilgrim)
router.get('/:id', authMiddleware, PilgrimSOSController.getSOSDetail);

// DELETE - Cancel SOS request
router.delete('/:id', authMiddleware, PilgrimSOSController.cancelSOS);

// ===================== LOCAL GUIDE APIs =====================

// GET - Get SOS requests at my site
router.get(
    '/site/list',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideSOSController.getSiteSOS
);

// GET - Get SOS detail (local guide)
router.get(
    '/site/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideSOSController.getSOSDetailForGuide
);

// PATCH - Assign (accept) SOS
router.patch(
    '/:id/assign',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideSOSController.assignSOS
);

// PATCH - Resolve SOS
router.patch(
    '/:id/resolve',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideSOSController.resolveSOS
);

// ===================== MANAGER APIs =====================

// GET - Get all SOS at site
router.get(
    '/manager/list',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerSOSController.getManagerSOS
);

// GET - Get SOS statistics
router.get(
    '/manager/stats',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerSOSController.getSOSStats
);

// PATCH - Assign a Local Guide to handle a pending SOS
router.patch(
    '/manager/:id/assign-guide',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerSOSController.assignGuide
);

// ===================== ADMIN APIs =====================

// GET - Get all SOS (all sites)
router.get(
    '/admin/list',
    authMiddleware,
    authMiddleware.authorize('admin'),
    AdminSOSController.getAdminSOS
);

// GET - Get SOS statistics (all sites)
router.get(
    '/admin/stats',
    authMiddleware,
    authMiddleware.authorize('admin'),
    AdminSOSController.getAdminSOSStats
);

module.exports = router;


