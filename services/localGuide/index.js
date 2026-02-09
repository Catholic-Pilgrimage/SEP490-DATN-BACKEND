const LocalGuideSiteService = require('./siteService');
const LocalGuideMediaService = require('./mediaService');
const LocalGuideScheduleService = require('./scheduleService');
const LocalGuideEventService = require('./eventService');
const LocalGuideShiftService = require('./shiftService');
const LocalGuideNearbyPlaceService = require('./nearbyPlaceService');
const LocalGuideSOSService = require('./sosService');

module.exports = {
    // Site
    getMySite: LocalGuideSiteService.getMySite.bind(LocalGuideSiteService),

    // Media
    generateMediaCode: LocalGuideMediaService.generateMediaCode.bind(LocalGuideMediaService),
    uploadMedia: LocalGuideMediaService.uploadMedia.bind(LocalGuideMediaService),
    getSiteMedia: LocalGuideMediaService.getSiteMedia.bind(LocalGuideMediaService),
    updateMedia: LocalGuideMediaService.updateMedia.bind(LocalGuideMediaService),
    deleteMedia: LocalGuideMediaService.deleteMedia.bind(LocalGuideMediaService),
    restoreMedia: LocalGuideMediaService.restoreMedia.bind(LocalGuideMediaService),

    // Schedule
    generateScheduleCode: LocalGuideScheduleService.generateScheduleCode.bind(LocalGuideScheduleService),
    createSchedule: LocalGuideScheduleService.createSchedule.bind(LocalGuideScheduleService),
    getSchedules: LocalGuideScheduleService.getSchedules.bind(LocalGuideScheduleService),
    updateSchedule: LocalGuideScheduleService.updateSchedule.bind(LocalGuideScheduleService),
    deleteSchedule: LocalGuideScheduleService.deleteSchedule.bind(LocalGuideScheduleService),
    restoreSchedule: LocalGuideScheduleService.restoreSchedule.bind(LocalGuideScheduleService),

    // Event
    generateEventCode: LocalGuideEventService.generateEventCode.bind(LocalGuideEventService),
    createEvent: LocalGuideEventService.createEvent.bind(LocalGuideEventService),
    getEvents: LocalGuideEventService.getEvents.bind(LocalGuideEventService),
    updateEvent: LocalGuideEventService.updateEvent.bind(LocalGuideEventService),
    deleteEvent: LocalGuideEventService.deleteEvent.bind(LocalGuideEventService),
    restoreEvent: LocalGuideEventService.restoreEvent.bind(LocalGuideEventService),

    // Shift
    generateShiftSubmissionCode: LocalGuideShiftService.generateShiftSubmissionCode.bind(LocalGuideShiftService),
    createSubmission: LocalGuideShiftService.createSubmission.bind(LocalGuideShiftService),
    getMySubmissions: LocalGuideShiftService.getMySubmissions.bind(LocalGuideShiftService),
    getSubmissionDetail: LocalGuideShiftService.getSubmissionDetail.bind(LocalGuideShiftService),
    updateSubmission: LocalGuideShiftService.updateSubmission.bind(LocalGuideShiftService),
    deleteSubmission: LocalGuideShiftService.deleteSubmission.bind(LocalGuideShiftService),
    getSiteSchedule: LocalGuideShiftService.getSiteSchedule.bind(LocalGuideShiftService),

    // Nearby Place
    generateNearbyPlaceCode: LocalGuideNearbyPlaceService.generateNearbyPlaceCode.bind(LocalGuideNearbyPlaceService),
    createNearbyPlace: LocalGuideNearbyPlaceService.createNearbyPlace.bind(LocalGuideNearbyPlaceService),
    getNearbyPlaces: LocalGuideNearbyPlaceService.getNearbyPlaces.bind(LocalGuideNearbyPlaceService),
    updateNearbyPlace: LocalGuideNearbyPlaceService.updateNearbyPlace.bind(LocalGuideNearbyPlaceService),
    deleteNearbyPlace: LocalGuideNearbyPlaceService.deleteNearbyPlace.bind(LocalGuideNearbyPlaceService),
    restoreNearbyPlace: LocalGuideNearbyPlaceService.restoreNearbyPlace.bind(LocalGuideNearbyPlaceService),

    // SOS
    LocalGuideSOSService
};
