// Export all Local Guide controllers from modular files

const siteController = require('./siteController');
const mediaController = require('./mediaController');
const scheduleController = require('./scheduleController');
const eventController = require('./eventController');
const shiftController = require('./shiftController');
const nearbyPlaceController = require('./nearbyPlaceController');
const LocalGuideSOSController = require('./SOSController');

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

    // SOS
    LocalGuideSOSController
};

