const PilgrimSOSController = require('./SOSController');
const PilgrimSiteController = require('./SiteController');
const PilgrimVerificationController = require('./VerificationController');
const PilgrimPlannerChatController = require('./PlannerChatController');
const PilgrimPlannerShareController = require('./PlannerShareController');
const PilgrimPlannerCalendarController = require('./PlannerCalendarController');
const PilgrimDashboardController = require('./DashboardController');
const PilgrimPlannerOfflineController = require('./PlannerOfflineController');
const PilgrimOfflineSyncController = require('./OfflineSyncController');
const PilgrimReviewController = require('./ReviewController');
const PilgrimFriendshipController = require('./FriendshipController');
const PilgrimPlannerEmergencyController = require('./PlannerEmergencyController');

module.exports = {
    PilgrimSOSController,
    PilgrimSiteController,
    PilgrimVerificationController,
    PilgrimPlannerChatController,
    PilgrimPlannerShareController,
    PilgrimPlannerCalendarController,
    PilgrimDashboardController,
    PilgrimPlannerOfflineController,
    PilgrimOfflineSyncController,
    PilgrimReviewController,
    PilgrimFriendshipController,
    PilgrimPlannerEmergencyController,
    PilgrimPlannerContinuationController: require('./PlannerContinuationController')
};
