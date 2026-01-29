const express = require('express');
const router = express.Router();
const SOSController = require('../controllers/SOSController');
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
router.post('/', authMiddleware, SOSController.createSOS);

// GET - Get my SOS requests
router.get('/', authMiddleware, SOSController.getMySOS);

// GET - Get SOS detail (pilgrim)
router.get('/:id', authMiddleware, SOSController.getSOSDetail);

// DELETE - Cancel SOS request
router.delete('/:id', authMiddleware, SOSController.cancelSOS);

// ===================== LOCAL GUIDE APIs =====================

// GET - Get SOS requests at my site
router.get(
    '/site/list',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    SOSController.getSiteSOS
);

// GET - Get SOS detail (local guide)
router.get(
    '/site/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    SOSController.getSOSDetailForGuide
);

// PATCH - Assign (accept) SOS
router.patch(
    '/:id/assign',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    SOSController.assignSOS
);

// PATCH - Resolve SOS
router.patch(
    '/:id/resolve',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    SOSController.resolveSOS
);

// ===================== MANAGER APIs =====================

// GET - Get all SOS at site
router.get(
    '/manager/list',
    authMiddleware,
    authMiddleware.authorize('manager'),
    SOSController.getManagerSOS
);

// GET - Get SOS statistics
router.get(
    '/manager/stats',
    authMiddleware,
    authMiddleware.authorize('manager'),
    SOSController.getSOSStats
);

// ===================== ADMIN APIs =====================

// GET - Get all SOS (all sites)
router.get(
    '/admin/list',
    authMiddleware,
    authMiddleware.authorize('admin'),
    SOSController.getAdminSOS
);

// GET - Get SOS statistics (all sites)
router.get(
    '/admin/stats',
    authMiddleware,
    authMiddleware.authorize('admin'),
    SOSController.getAdminSOSStats
);

module.exports = router;

