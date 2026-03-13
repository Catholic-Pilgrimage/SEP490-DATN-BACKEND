const { User, Site, UserCheckin, SOSRequest, SiteMedia, MassSchedule, Event, NearbyPlace, GuideShiftSubmission, PlannerItem } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

class LocalGuideDashboardService {
    /**
     * Get local guide dashboard overview
     * @param {string} localGuideId - Local Guide user ID
     */
    static async getOverview(localGuideId) {
        try {
            // Get local guide info and their site
            const localGuide = await User.findByPk(localGuideId, {
                include: [{
                    model: Site,
                    as: 'assignedSite',
                    attributes: ['id', 'code', 'name', 'region', 'type', 'cover_image']
                }]
            });

            if (!localGuide || !localGuide.site_id) {
                throw new Error('Local Guide not assigned to any site');
            }

            const siteId = localGuide.site_id;
            const siteInfo = localGuide.assignedSite;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 1. Personal Stats (Thành tích cá nhân)
            // Total shifts completed by this guide
            const totalShiftsCompleted = await GuideShiftSubmission.count({
                where: {
                    guide_id: localGuideId,
                    status: 'approved'
                }
            });

            // Total SOS resolved by this guide
            const totalSOSResolved = await SOSRequest.count({
                where: {
                    assigned_to: localGuideId,
                    status: 'resolved'
                }
            });

            // 2. My Contributions (Đóng góp nội dung của guide này)
            // Media contributions
            const myMediaTotal = await SiteMedia.count({
                where: { site_id: siteId, created_by: localGuideId }
            });
            const myMediaPending = await SiteMedia.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'pending' }
            });
            const myMediaApproved = await SiteMedia.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'approved' }
            });
            const myMediaRejected = await SiteMedia.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'rejected' }
            });

            // Schedule contributions
            const mySchedulesTotal = await MassSchedule.count({
                where: { site_id: siteId, created_by: localGuideId }
            });
            const mySchedulesPending = await MassSchedule.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'pending' }
            });
            const mySchedulesApproved = await MassSchedule.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'approved' }
            });
            const mySchedulesRejected = await MassSchedule.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'rejected' }
            });

            // Event contributions
            const myEventsTotal = await Event.count({
                where: { site_id: siteId, created_by: localGuideId }
            });
            const myEventsPending = await Event.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'pending' }
            });
            const myEventsApproved = await Event.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'approved' }
            });
            const myEventsRejected = await Event.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'rejected' }
            });

            // Nearby Place contributions
            const myNearbyPlacesTotal = await NearbyPlace.count({
                where: { site_id: siteId, created_by: localGuideId }
            });
            const myNearbyPlacesPending = await NearbyPlace.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'pending' }
            });
            const myNearbyPlacesApproved = await NearbyPlace.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'approved' }
            });
            const myNearbyPlacesRejected = await NearbyPlace.count({
                where: { site_id: siteId, created_by: localGuideId, status: 'rejected' }
            });

            // 3. Site Overview (Tình hình chung của site)
            // Pending SOS at site
            const pendingSOSAtSite = await SOSRequest.count({
                where: {
                    site_id: siteId,
                    status: 'pending'
                }
            });

            // Check-ins today at site
            const checkinsToday = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: today }
                },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    where: { site_id: siteId },
                    attributes: [],
                    required: true
                }]
            });

            Logger.info(`Local Guide dashboard overview fetched for user ${localGuideId} at site ${siteId}`);

            return {
                site: siteInfo,
                personal_stats: {
                    shifts_completed: totalShiftsCompleted,
                    sos_resolved: totalSOSResolved
                },
                my_contributions: {
                    media: {
                        total: myMediaTotal,
                        pending: myMediaPending,
                        approved: myMediaApproved,
                        rejected: myMediaRejected
                    },
                    schedules: {
                        total: mySchedulesTotal,
                        pending: mySchedulesPending,
                        approved: mySchedulesApproved,
                        rejected: mySchedulesRejected
                    },
                    events: {
                        total: myEventsTotal,
                        pending: myEventsPending,
                        approved: myEventsApproved,
                        rejected: myEventsRejected
                    },
                    nearby_places: {
                        total: myNearbyPlacesTotal,
                        pending: myNearbyPlacesPending,
                        approved: myNearbyPlacesApproved,
                        rejected: myNearbyPlacesRejected
                    }
                },
                site_overview: {
                    pending_sos: pendingSOSAtSite,
                    checkins_today: checkinsToday
                }
            };
        } catch (error) {
            Logger.error('Get local guide dashboard overview error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideDashboardService;
