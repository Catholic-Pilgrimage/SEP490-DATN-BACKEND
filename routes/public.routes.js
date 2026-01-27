const express = require('express');
const router = express.Router();
const SiteController = require('../controllers/SiteController');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// GET /api/sites - Get all approved sites
router.get('/', SiteController.getPublicSites);

// GET /api/sites/:id - Get site detail by ID or code
router.get('/:id', SiteController.getPublicSiteById);

// GET /api/sites/:siteId/media - Get site media (gallery)
router.get('/:siteId/media', SiteController.getPublicSiteMedia);

// GET /api/sites/:siteId/mass-schedules - Get site mass schedules
router.get('/:siteId/mass-schedules', SiteController.getPublicSiteMassSchedules);

// GET /api/sites/:siteId/events - Get site events
router.get('/:siteId/events', SiteController.getPublicSiteEvents);

// GET /api/sites/:siteId/nearby-places - Get site nearby places
router.get('/:siteId/nearby-places', SiteController.getPublicSiteNearbyPlaces);

module.exports = router;
