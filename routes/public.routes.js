const express = require('express');
const router = express.Router();
const PublicSiteController = require('../controllers/pilgrim/SiteController');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// GET /api/sites/available - Get sites available for manager transition
router.get('/available', PublicSiteController.getAvailableSites);

// GET /api/sites - Get all approved sites
router.get('/', PublicSiteController.getPublicSites);

// GET /api/sites/:id - Get site detail by ID or code
router.get('/:id', PublicSiteController.getPublicSiteById);

// GET /api/sites/:siteId/media - Get site media (gallery)
router.get('/:siteId/media', PublicSiteController.getPublicSiteMedia);

// GET /api/sites/:siteId/mass-schedules - Get site mass schedules
router.get('/:siteId/mass-schedules', PublicSiteController.getPublicSiteMassSchedules);

// GET /api/sites/:siteId/events - Get site events
router.get('/:siteId/events', PublicSiteController.getPublicSiteEvents);

// GET /api/sites/:siteId/nearby-places - Get site nearby places
router.get('/:siteId/nearby-places', PublicSiteController.getPublicSiteNearbyPlaces);

module.exports = router;
