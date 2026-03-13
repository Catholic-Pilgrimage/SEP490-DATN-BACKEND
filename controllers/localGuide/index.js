// Export all Local Guide controllers from modular files

const siteController = require('./siteController');
const mediaController = require('./mediaController');
const scheduleController = require('./scheduleController');
const eventController = require('./eventController');
const shiftController = require('./shiftController');
const nearbyPlaceController = require('./nearbyPlaceController');
const narrativeController = require('./narrativeController');
const LocalGuideSOSController = require('./SOSController');
const LocalGuideDashboardController = require('./DashboardController');

module.exports = {
    // Site
    ...siteController,

    // Media
    ...mediaController,

    // Schedule
    ...scheduleController,

    // Event
    ...eventController,

    // Shift
    ...shiftController,

    // Nearby Place
    ...nearbyPlaceController,

    // Narrative (3D Model Audio)
    ...narrativeController,

    // SOS
    LocalGuideSOSController,

    // Dashboard
    LocalGuideDashboardController
};

