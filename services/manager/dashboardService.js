const { User, Site, UserCheckin, SOSRequest, SiteMedia, MassSchedule, Event, NearbyPlace, GuideShiftSubmission } = require('../../models');
const { Op, fn, col } = require('sequelize');
const Logger = require('../../utils/logger.util');

class ManagerDashboardService {
    /**
     * Get manager dashboard overview for their site
     * @param {string} managerId - Manager user ID
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date }
     */
    static async getOverview(managerId, filters = {}) {
        try {
            const { PlannerItem } = require('../../models');

            // Get manager info and their site
            const manager = await User.findByPk(managerId, {
                include: [{
                    model: Site,
                    as: 'assignedSite',
                    attributes: ['id', 'code', 'name', 'region', 'type', 'cover_image']
                }]
            });

            if (!manager || !manager.site_id) {
                throw new Error('Manager not assigned to any site');
            }

            const siteId = manager.site_id;
            const siteInfo = manager.assignedSite;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate date range based on filter
            let startDate, endDate;

            if (filters.period === 'custom' && filters.from_date && filters.to_date) {
                startDate = new Date(filters.from_date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(filters.to_date);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'today') {
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'week') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else {
                // Default: All time (no filter)
                startDate = null;
                endDate = null;
            }

            // Local Guides at this site
            const totalLocalGuides = await User.count({
                where: {
                    site_id: siteId,
                    role: 'local_guide',
                    status: 'active'
                }
            });

            // Check-ins at this site (filtered by date) - JOIN through PlannerItem
            const checkinWhere = {};
            if (startDate && endDate) {
                checkinWhere.checkin_date = { [Op.between]: [startDate, endDate] };
            }

            const totalCheckins = await UserCheckin.count({
                where: checkinWhere,
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    where: { site_id: siteId },
                    attributes: [],
                    required: true
                }]
            });

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

            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay());
            const checkinsThisWeek = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: thisWeekStart }
                },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    where: { site_id: siteId },
                    attributes: [],
                    required: true
                }]
            });

            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const checkinsThisMonth = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: thisMonthStart }
                },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    where: { site_id: siteId },
                    attributes: [],
                    required: true
                }]
            });

            // SOS at this site (filtered by date)
            const sosWhere = { site_id: siteId };
            if (startDate && endDate) {
                sosWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalSOS = await SOSRequest.count({ where: sosWhere });

            const sosByStatus = await SOSRequest.findAll({
                where: sosWhere,
                attributes: [
                    'status',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const sosStatusMap = {
                pending: 0,
                accepted: 0,
                resolved: 0,
                cancelled: 0
            };
            sosByStatus.forEach(item => {
                sosStatusMap[item.status] = parseInt(item.count);
            });

            // Content stats (total, pending, approved, rejected)
            const totalMedia = await SiteMedia.count({ where: { site_id: siteId } });
            const pendingMedia = await SiteMedia.count({
                where: { site_id: siteId, status: 'pending' }
            });
            const approvedMedia = await SiteMedia.count({
                where: { site_id: siteId, status: 'approved' }
            });
            const rejectedMedia = await SiteMedia.count({
                where: { site_id: siteId, status: 'rejected' }
            });
            
            const totalSchedules = await MassSchedule.count({ where: { site_id: siteId } });
            const pendingSchedules = await MassSchedule.count({
                where: { site_id: siteId, status: 'pending' }
            });
            const approvedSchedules = await MassSchedule.count({
                where: { site_id: siteId, status: 'approved' }
            });
            const rejectedSchedules = await MassSchedule.count({
                where: { site_id: siteId, status: 'rejected' }
            });
            
            const totalEvents = await Event.count({ where: { site_id: siteId } });
            const pendingEvents = await Event.count({
                where: { site_id: siteId, status: 'pending' }
            });
            const approvedEvents = await Event.count({
                where: { site_id: siteId, status: 'approved' }
            });
            const rejectedEvents = await Event.count({
                where: { site_id: siteId, status: 'rejected' }
            });
            
            const totalNearbyPlaces = await NearbyPlace.count({ where: { site_id: siteId } });
            const pendingNearbyPlaces = await NearbyPlace.count({
                where: { site_id: siteId, status: 'pending' }
            });
            const approvedNearbyPlaces = await NearbyPlace.count({
                where: { site_id: siteId, status: 'approved' }
            });
            const rejectedNearbyPlaces = await NearbyPlace.count({
                where: { site_id: siteId, status: 'rejected' }
            });
            
            const totalShifts = await GuideShiftSubmission.count({ where: { site_id: siteId } });
            const pendingShifts = await GuideShiftSubmission.count({
                where: { site_id: siteId, status: 'pending' }
            });
            const approvedShifts = await GuideShiftSubmission.count({
                where: { site_id: siteId, status: 'approved' }
            });
            const rejectedShifts = await GuideShiftSubmission.count({
                where: { site_id: siteId, status: 'rejected' }
            });

            Logger.info(`Manager dashboard overview fetched for site ${siteId} (period: ${filters.period || 'all'})`);

            return {
                filter_applied: {
                    period: filters.period || 'all',
                    from_date: startDate ? startDate.toISOString().split('T')[0] : null,
                    to_date: endDate ? endDate.toISOString().split('T')[0] : null
                },
                site: siteInfo,
                local_guides: {
                    total: totalLocalGuides
                },
                checkins: {
                    total: totalCheckins,
                    today: checkinsToday,
                    this_week: checkinsThisWeek,
                    this_month: checkinsThisMonth
                },
                sos: {
                    total: totalSOS,
                    by_status: sosStatusMap
                },
                content_stats: {
                    media: {
                        total: totalMedia,
                        pending: pendingMedia,
                        approved: approvedMedia,
                        rejected: rejectedMedia
                    },
                    schedules: {
                        total: totalSchedules,
                        pending: pendingSchedules,
                        approved: approvedSchedules,
                        rejected: rejectedSchedules
                    },
                    events: {
                        total: totalEvents,
                        pending: pendingEvents,
                        approved: approvedEvents,
                        rejected: rejectedEvents
                    },
                    nearby_places: {
                        total: totalNearbyPlaces,
                        pending: pendingNearbyPlaces,
                        approved: approvedNearbyPlaces,
                        rejected: rejectedNearbyPlaces
                    },
                    shifts: {
                        total: totalShifts,
                        pending: pendingShifts,
                        approved: approvedShifts,
                        rejected: rejectedShifts
                    }
                },
                pending_tasks: {
                    total: pendingMedia + pendingSchedules + pendingEvents + pendingNearbyPlaces + pendingShifts
                }
            };
        } catch (error) {
            Logger.error('Get manager dashboard overview error:', error);
            throw error;
        }
    }

    /**
     * Get check-ins analytics for manager's site
     * @param {string} managerId - Manager user ID
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date, days }
     */
    static async getCheckinsAnalytics(managerId, filters = {}) {
        try {
            const { PlannerItem } = require('../../models');

            // Get manager's site
            const manager = await User.findByPk(managerId);
            if (!manager || !manager.site_id) {
                throw new Error('Manager not assigned to any site');
            }

            const siteId = manager.site_id;
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            let startDate, endDate;

            // Priority: period filter > days parameter
            if (filters.period === 'custom' && filters.from_date && filters.to_date) {
                startDate = new Date(filters.from_date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(filters.to_date);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'today') {
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'week') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.days) {
                // Fallback to days parameter
                startDate = new Date();
                startDate.setDate(startDate.getDate() - parseInt(filters.days));
                endDate = new Date();
            } else {
                // Default: last 30 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                endDate = new Date();
            }

            const checkins = await UserCheckin.findAll({
                where: {
                    checkin_date: { [Op.between]: [startDate, endDate] }
                },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    where: { site_id: siteId },
                    attributes: [],
                    required: true
                }],
                attributes: [
                    [fn('DATE', col('UserCheckin.checkin_date')), 'date'],
                    [fn('COUNT', col('UserCheckin.id')), 'count']
                ],
                group: [fn('DATE', col('UserCheckin.checkin_date'))],
                order: [[fn('DATE', col('UserCheckin.checkin_date')), 'ASC']],
                raw: true
            });

            Logger.info(`Manager checkins analytics fetched for site ${siteId} (period: ${filters.period || 'days'})`);

            return checkins.map(item => ({
                date: item.date,
                count: parseInt(item.count)
            }));
        } catch (error) {
            Logger.error('Get manager checkins analytics error:', error);
            throw error;
        }
    }
}

module.exports = ManagerDashboardService;
