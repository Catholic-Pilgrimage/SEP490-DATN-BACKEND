const { User, Site, Planner, UserCheckin, Journal, Post, PostLike, PostComment, SOSRequest, VerificationRequest, SiteMedia, MassSchedule, Event, NearbyPlace, GuideShiftSubmission, Report } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const Logger = require('../../utils/logger.util');

class AdminDashboardService {
    /**
     * Get overview dashboard statistics
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date }
     */
    static async getOverview(filters = {}) {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Calculate date range based on filter
            let startDate, endDate;

            if (filters.period === 'custom' && filters.from_date && filters.to_date) {
                // Custom date range
                startDate = new Date(filters.from_date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(filters.to_date);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'today') {
                // Today only
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'week') {
                // This week (Sunday to Saturday)
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.period === 'month') {
                // This month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
            } else {
                // Default: All time (no filter)
                startDate = null;
                endDate = null;
            }

            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay());
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            // Users statistics (filtered by date range if provided)
            const userWhere = {};
            if (startDate && endDate) {
                userWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalUsers = await User.count({ where: userWhere });

            const usersByRole = await User.findAll({
                where: userWhere,
                attributes: [
                    'role',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['role'],
                raw: true
            });

            const usersRoleMap = {
                pilgrim: 0,
                local_guide: 0,
                manager: 0,
                admin: 0
            };
            usersByRole.forEach(item => {
                usersRoleMap[item.role] = parseInt(item.count);
            });

            const newUsersThisMonth = await User.count({
                where: {
                    created_at: { [Op.gte]: thisMonthStart }
                }
            });

            const bannedWhere = { status: 'banned' };
            if (startDate && endDate) {
                bannedWhere.created_at = { [Op.between]: [startDate, endDate] };
            }
            const bannedUsers = await User.count({ where: bannedWhere });

            // Sites statistics
            const totalSites = await Site.count();
            const activeSites = await Site.count({ where: { is_active: true } });
            const inactiveSites = await Site.count({ where: { is_active: false } });

            const sitesByRegion = await Site.findAll({
                where: { is_active: true },
                attributes: [
                    'region',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['region'],
                raw: true
            });

            const sitesRegionMap = { Bac: 0, Trung: 0, Nam: 0 };
            sitesByRegion.forEach(item => {
                sitesRegionMap[item.region] = parseInt(item.count);
            });

            const sitesByType = await Site.findAll({
                where: { is_active: true },
                attributes: [
                    'type',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['type'],
                raw: true
            });

            const sitesTypeMap = {
                church: 0,
                shrine: 0,
                monastery: 0,
                center: 0,
                other: 0
            };
            sitesByType.forEach(item => {
                sitesTypeMap[item.type] = parseInt(item.count);
            });

            // Planners statistics (filtered by date range)
            const plannerWhere = {};
            if (startDate && endDate) {
                plannerWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalPlanners = await Planner.count({ where: plannerWhere });
            const plannersByStatus = await Planner.findAll({
                where: plannerWhere,
                attributes: [
                    'status',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const plannersStatusMap = {
                planning: 0,
                locked: 0,
                ongoing: 0,
                completed: 0
            };
            plannersByStatus.forEach(item => {
                plannersStatusMap[item.status] = parseInt(item.count);
            });

            // Check-ins statistics (filtered by date range)
            const checkinWhere = {};
            if (startDate && endDate) {
                checkinWhere.checkin_date = { [Op.between]: [startDate, endDate] };
            }

            const totalCheckins = await UserCheckin.count({ where: checkinWhere });
            const checkinsToday = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: today }
                }
            });
            const checkinsThisWeek = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: thisWeekStart }
                }
            });
            const checkinsThisMonth = await UserCheckin.count({
                where: {
                    checkin_date: { [Op.gte]: thisMonthStart }
                }
            });

            // Journals statistics (filtered by date range)
            const journalWhere = {};
            if (startDate && endDate) {
                journalWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalJournals = await Journal.count({ where: journalWhere });
            const publicJournals = await Journal.count({
                where: { ...journalWhere, privacy: 'public' }
            });
            const privateJournals = await Journal.count({
                where: { ...journalWhere, privacy: 'private' }
            });
            const journalsThisMonth = await Journal.count({
                where: {
                    created_at: { [Op.gte]: thisMonthStart }
                }
            });

            // Posts statistics (filtered by date range)
            const postWhere = {};
            if (startDate && endDate) {
                postWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalPosts = await Post.count({ where: postWhere });
            const postsThisMonth = await Post.count({
                where: {
                    created_at: { [Op.gte]: thisMonthStart }
                }
            });
            // Likes and Comments also filtered by date range
            const likeWhere = {};
            const commentWhere = {};
            if (startDate && endDate) {
                likeWhere.created_at = { [Op.between]: [startDate, endDate] };
                commentWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalLikes = await PostLike.count({ where: likeWhere });
            const totalComments = await PostComment.count({ where: commentWhere });

            // SOS statistics (filtered by date range)
            const sosWhere = {};
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

            // SOS by region (join with Site)
            const sosByRegion = await SOSRequest.findAll({
                where: sosWhere,
                attributes: [
                    [fn('COUNT', col('SOSRequest.id')), 'count']
                ],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['region'],
                    required: false
                }],
                group: ['site.region'],
                raw: true
            });

            const sosRegionMap = { Bac: 0, Trung: 0, Nam: 0, unknown: 0 };
            sosByRegion.forEach(item => {
                const region = item['site.region'];
                if (region && sosRegionMap.hasOwnProperty(region)) {
                    sosRegionMap[region] = parseInt(item.count);
                } else if (!region) {
                    sosRegionMap.unknown += parseInt(item.count);
                }
            });

            // Average resolution time for resolved SOS (filtered)
            const resolvedSOSWhere = {
                status: 'resolved',
                resolved_at: { [Op.ne]: null }
            };
            if (startDate && endDate) {
                resolvedSOSWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const resolvedSOS = await SOSRequest.findAll({
                where: resolvedSOSWhere,
                attributes: [
                    [fn('AVG', literal('EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60')), 'avg_minutes']
                ],
                raw: true
            });
            const avgResolutionMinutes = resolvedSOS[0]?.avg_minutes ? Math.round(parseFloat(resolvedSOS[0].avg_minutes)) : 0;

            // Reports statistics (filtered by date range)
            const reportWhere = {};
            if (startDate && endDate) {
                reportWhere.created_at = { [Op.between]: [startDate, endDate] };
            }

            const totalReports = await Report.count({ where: reportWhere });

            const reportsByStatus = await Report.findAll({
                where: reportWhere,
                attributes: [
                    'status',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const reportsStatusMap = {
                pending: 0,
                resolved: 0,
                reject: 0
            };
            reportsByStatus.forEach(item => {
                reportsStatusMap[item.status] = parseInt(item.count);
            });

            const reportsByReason = await Report.findAll({
                where: reportWhere,
                attributes: [
                    'reason',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['reason'],
                raw: true
            });

            const reportsReasonMap = {
                spam: 0,
                inappropriate: 0,
                harassment: 0,
                other: 0
            };
            reportsByReason.forEach(item => {
                reportsReasonMap[item.reason] = parseInt(item.count);
            });

            // Content pending review (always current, not filtered by date)
            const pendingVerifications = await VerificationRequest.count({ where: { status: 'pending' } });
            const pendingMedia = await SiteMedia.count({ where: { status: 'pending', is_active: true } });
            const pendingSchedules = await MassSchedule.count({ where: { status: 'pending', is_active: true } });
            const pendingEvents = await Event.count({ where: { status: 'pending', is_active: true } });
            const pendingNearbyPlaces = await NearbyPlace.count({ where: { status: 'pending', is_active: true } });
            const pendingShifts = await GuideShiftSubmission.count({ where: { status: 'pending' } });

            Logger.info(`Admin dashboard overview fetched successfully (period: ${filters.period || 'all'}, from: ${startDate || 'N/A'}, to: ${endDate || 'N/A'})`);

            return {
                filter_applied: {
                    period: filters.period || 'all',
                    from_date: startDate ? startDate.toISOString().split('T')[0] : null,
                    to_date: endDate ? endDate.toISOString().split('T')[0] : null
                },
                users: {
                    total: totalUsers,
                    by_role: usersRoleMap,
                    new_this_month: newUsersThisMonth,
                    banned: bannedUsers
                },
                sites: {
                    total: totalSites,
                    active: activeSites,
                    inactive: inactiveSites,
                    by_region: sitesRegionMap,
                    by_type: sitesTypeMap
                },
                planners: {
                    total: totalPlanners,
                    ...plannersStatusMap
                },
                checkins: {
                    total: totalCheckins,
                    today: checkinsToday,
                    this_week: checkinsThisWeek,
                    this_month: checkinsThisMonth
                },
                journals: {
                    total: totalJournals,
                    public: publicJournals,
                    private: privateJournals,
                    this_month: journalsThisMonth
                },
                posts: {
                    total: totalPosts,
                    this_month: postsThisMonth,
                    total_likes: totalLikes,
                    total_comments: totalComments
                },
                sos: {
                    total: totalSOS,
                    by_status: sosStatusMap,
                    by_region: sosRegionMap,
                    avg_resolution_minutes: avgResolutionMinutes
                },
                reports: {
                    total: totalReports,
                    by_status: reportsStatusMap,
                    by_reason: reportsReasonMap
                },
                content_pending_review: {
                    verification_requests: pendingVerifications,
                    media: pendingMedia,
                    schedules: pendingSchedules,
                    events: pendingEvents,
                    nearby_places: pendingNearbyPlaces,
                    shifts: pendingShifts
                }
            };
        } catch (error) {
            Logger.error('Get dashboard overview error:', error);
            throw error;
        }
    }

    /**
     * Get user growth analytics
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date, days }
     */
    static async getUserGrowth(filters = {}) {
        try {
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

            const users = await User.findAll({
                where: {
                    created_at: { [Op.between]: [startDate, endDate] }
                },
                attributes: [
                    [fn('DATE', col('created_at')), 'date'],
                    [fn('COUNT', col('id')), 'count']
                ],
                group: [fn('DATE', col('created_at'))],
                order: [[fn('DATE', col('created_at')), 'ASC']],
                raw: true
            });

            Logger.info(`User growth analytics fetched (period: ${filters.period || 'days'}, from: ${startDate.toISOString().split('T')[0]}, to: ${endDate.toISOString().split('T')[0]})`);

            return users.map(item => ({
                date: item.date,
                count: parseInt(item.count)
            }));
        } catch (error) {
            Logger.error('Get user growth error:', error);
            throw error;
        }
    }

    /**
     * Get check-ins analytics
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date, days }
     */
    static async getCheckinsAnalytics(filters = {}) {
        try {
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
                attributes: [
                    [fn('DATE', col('checkin_date')), 'date'],
                    [fn('COUNT', col('id')), 'count']
                ],
                group: [fn('DATE', col('checkin_date'))],
                order: [[fn('DATE', col('checkin_date')), 'ASC']],
                raw: true
            });

            Logger.info(`Checkins analytics fetched (period: ${filters.period || 'days'}, from: ${startDate.toISOString().split('T')[0]}, to: ${endDate.toISOString().split('T')[0]})`);

            return checkins.map(item => ({
                date: item.date,
                count: parseInt(item.count)
            }));
        } catch (error) {
            Logger.error('Get checkins analytics error:', error);
            throw error;
        }
    }

    /**
     * Get popular sites (most visited)
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date, limit }
     */
    static async getPopularSites(filters = {}) {
        try {
            const { PlannerItem } = require('../../models');

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            let startDate, endDate;
            const plannerItemWhere = {};

            // Calculate date range based on filter
            if (filters.period === 'custom' && filters.from_date && filters.to_date) {
                startDate = new Date(filters.from_date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(filters.to_date);
                endDate.setHours(23, 59, 59, 999);
                plannerItemWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'today') {
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                plannerItemWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'week') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                plannerItemWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                plannerItemWhere.created_at = { [Op.between]: [startDate, endDate] };
            }
            // If no period, don't filter by date (all time)

            const limit = parseInt(filters.limit) || 10;

            const popularSites = await PlannerItem.findAll({
                where: plannerItemWhere,
                attributes: [
                    'site_id',
                    [fn('COUNT', col('PlannerItem.id')), 'visit_count']
                ],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'code', 'name', 'region', 'type', 'cover_image']
                }],
                group: ['site_id', 'site.id'],
                order: [[fn('COUNT', col('PlannerItem.id')), 'DESC']],
                limit: limit,
                raw: false
            });

            Logger.info(`Popular sites fetched (period: ${filters.period || 'all'}, limit: ${limit})`);

            return popularSites.map(item => ({
                site: {
                    id: item.site.id,
                    code: item.site.code,
                    name: item.site.name,
                    region: item.site.region,
                    type: item.site.type,
                    cover_image: item.site.cover_image
                },
                visit_count: parseInt(item.dataValues.visit_count)
            }));
        } catch (error) {
            Logger.error('Get popular sites error:', error);
            throw error;
        }
    }

    /**
     * Get SOS requests by site (top sites with most SOS)
     * @param {Object} filters - { period: 'today'|'week'|'month'|'custom', from_date, to_date, limit }
     */
    static async getSOSBySite(filters = {}) {
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            let startDate, endDate;
            const sosWhere = {};

            // Calculate date range based on filter
            if (filters.period === 'custom' && filters.from_date && filters.to_date) {
                startDate = new Date(filters.from_date);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(filters.to_date);
                endDate.setHours(23, 59, 59, 999);
                sosWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'today') {
                startDate = new Date(today);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                sosWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'week') {
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                sosWhere.created_at = { [Op.between]: [startDate, endDate] };
            } else if (filters.period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                sosWhere.created_at = { [Op.between]: [startDate, endDate] };
            }
            // If no period, don't filter by date (all time)

            // Only count SOS that have site_id
            sosWhere.site_id = { [Op.ne]: null };

            const limit = parseInt(filters.limit) || 10;

            const sosBySite = await SOSRequest.findAll({
                where: sosWhere,
                attributes: [
                    'site_id',
                    [fn('COUNT', col('SOSRequest.id')), 'sos_count'],
                    [fn('COUNT', literal("CASE WHEN status = 'resolved' THEN 1 END")), 'resolved_count'],
                    [fn('COUNT', literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending_count']
                ],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'code', 'name', 'region', 'type', 'cover_image']
                }],
                group: ['site_id', 'site.id'],
                order: [[fn('COUNT', col('SOSRequest.id')), 'DESC']],
                limit: limit,
                raw: false
            });

            Logger.info(`SOS by site fetched (period: ${filters.period || 'all'}, limit: ${limit})`);

            return sosBySite.map(item => ({
                site: {
                    id: item.site.id,
                    code: item.site.code,
                    name: item.site.name,
                    region: item.site.region,
                    type: item.site.type,
                    cover_image: item.site.cover_image
                },
                sos_count: parseInt(item.dataValues.sos_count),
                resolved_count: parseInt(item.dataValues.resolved_count),
                pending_count: parseInt(item.dataValues.pending_count)
            }));
        } catch (error) {
            Logger.error('Get SOS by site error:', error);
            throw error;
        }
    }
}

module.exports = AdminDashboardService;
