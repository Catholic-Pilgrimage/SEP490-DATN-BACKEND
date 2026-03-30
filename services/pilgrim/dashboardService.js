const { User, Planner, PlannerItem, UserCheckin, Journal, UserFavorite, Site } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const Logger = require('../../utils/logger.util');

class PilgrimDashboardService {
    /**
     * Get pilgrim dashboard overview
     * @param {string} pilgrimId - Pilgrim user ID
     */
    static async getOverview(pilgrimId) {
        try {
            const now = new Date();

            // 1. Journey Overview
            // Total check-ins
            const totalCheckins = await UserCheckin.count({
                where: { user_id: pilgrimId }
            });

            // Total journals
            const totalJournals = await Journal.count({
                where: { user_id: pilgrimId }
            });

            // Total favorites
            const totalFavorites = await UserFavorite.count({
                where: { user_id: pilgrimId }
            });

            // First check-in date and pilgrimage days
            const firstCheckin = await UserCheckin.findOne({
                where: { user_id: pilgrimId },
                order: [['checkin_date', 'ASC']],
                attributes: ['checkin_date']
            });

            let pilgrimageDays = 0;
            let firstCheckinDate = null;
            if (firstCheckin) {
                firstCheckinDate = firstCheckin.checkin_date;
                const diffTime = Math.abs(now - new Date(firstCheckinDate));
                pilgrimageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            // 2. Current Plans
            // Ongoing plan
            const ongoingPlan = await Planner.findOne({
                where: {
                    user_id: pilgrimId,
                    status: 'ongoing',
                    is_active: true
                },
                include: [{
                    model: PlannerItem,
                    as: 'items',
                    attributes: ['id', 'site_id'],
                    include: [{
                        model: UserCheckin,
                        as: 'checkins',
                        where: { user_id: pilgrimId },
                        required: false,
                        attributes: ['id']
                    }]
                }],
                order: [['start_date', 'DESC']]
            });

            let ongoingPlanData = null;
            if (ongoingPlan) {
                const totalSites = ongoingPlan.items.length;
                const checkedInSites = ongoingPlan.items.filter(item => item.checkins && item.checkins.length > 0).length;
                const progressPercentage = totalSites > 0 ? Math.round((checkedInSites / totalSites) * 100) : 0;

                ongoingPlanData = {
                    id: ongoingPlan.id,
                    name: ongoingPlan.name,
                    start_date: ongoingPlan.start_date,
                    end_date: ongoingPlan.end_date,
                    total_sites: totalSites,
                    checked_in_sites: checkedInSites,
                    progress_percentage: progressPercentage
                };
            }

            // Upcoming plan (planning status, closest start_date)
            const upcomingPlan = await Planner.findOne({
                where: {
                    user_id: pilgrimId,
                    status: { [Op.in]: ['planning', 'locked'] },
                    is_active: true,
                    start_date: { [Op.gte]: now }
                },
                include: [{
                    model: PlannerItem,
                    as: 'items',
                    attributes: ['id']
                }],
                order: [['start_date', 'ASC']]
            });

            let upcomingPlanData = null;
            if (upcomingPlan) {
                upcomingPlanData = {
                    id: upcomingPlan.id,
                    name: upcomingPlan.name,
                    start_date: upcomingPlan.start_date,
                    total_sites: upcomingPlan.items.length
                };
            }

            // 3. Recent Activity
            // Recent check-ins (last 5)
            const recentCheckins = await UserCheckin.findAll({
                where: { user_id: pilgrimId },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    attributes: ['site_id'],
                    include: [{
                        model: Site,
                        as: 'site',
                        attributes: ['name']
                    }]
                }],
                order: [['checkin_date', 'DESC']],
                limit: 5
            });

            const recentCheckinsData = await Promise.all(recentCheckins.map(async (checkin) => {
                // Check if there's a journal for this site on this date
                const hasJournal = await Journal.count({
                    where: {
                        user_id: pilgrimId,
                        site_id: checkin.plannerItem?.site_id,
                        created_at: {
                            [Op.gte]: new Date(checkin.checkin_date),
                            [Op.lt]: new Date(new Date(checkin.checkin_date).getTime() + 24 * 60 * 60 * 1000)
                        }
                    }
                }) > 0;

                return {
                    site_name: checkin.plannerItem?.site?.name || 'Unknown',
                    checkin_date: checkin.checkin_date,
                    has_journal: hasJournal
                };
            }));

            // Recent journals (last 3)
            const recentJournals = await Journal.findAll({
                where: { user_id: pilgrimId },
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['name']
                }],
                order: [['created_at', 'DESC']],
                limit: 3,
                attributes: ['id', 'title', 'site_id', 'created_at']
            });

            const recentJournalsData = recentJournals.map(journal => ({
                id: journal.id,
                title: journal.title,
                site_name: journal.site?.name || null,
                created_at: journal.created_at
            }));

            // 4. Stats by Region
            // Get unique sites checked in by region using GROUP BY
            const statsByRegion = await UserCheckin.findAll({
                where: { user_id: pilgrimId },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    attributes: [],
                    include: [{
                        model: Site,
                        as: 'site',
                        attributes: []
                    }]
                }],
                attributes: [
                    [col('plannerItem->site.region'), 'region'],
                    [fn('COUNT', fn('DISTINCT', col('plannerItem->site.id'))), 'count']
                ],
                group: [col('plannerItem->site.region')],
                raw: true
            });

            const regionCounts = { Bac: 0, Trung: 0, Nam: 0 };
            statsByRegion.forEach(stat => {
                if (stat.region && regionCounts.hasOwnProperty(stat.region)) {
                    regionCounts[stat.region] = parseInt(stat.count);
                }
            });

            // 5. Stats by Type
            const statsByType = await UserCheckin.findAll({
                where: { user_id: pilgrimId },
                include: [{
                    model: PlannerItem,
                    as: 'plannerItem',
                    attributes: [],
                    include: [{
                        model: Site,
                        as: 'site',
                        attributes: []
                    }]
                }],
                attributes: [
                    [col('plannerItem->site.type'), 'type'],
                    [fn('COUNT', fn('DISTINCT', col('plannerItem->site.id'))), 'count']
                ],
                group: [col('plannerItem->site.type')],
                raw: true
            });

            const typeCounts = { church: 0, shrine: 0, monastery: 0, center: 0, other: 0 };
            statsByType.forEach(stat => {
                if (stat.type && typeCounts.hasOwnProperty(stat.type)) {
                    typeCounts[stat.type] = parseInt(stat.count);
                }
            });

            Logger.info(`Pilgrim dashboard overview fetched for user ${pilgrimId}`);

            return {
                journey_overview: {
                    total_checkins: totalCheckins,
                    total_journals: totalJournals,
                    total_favorites: totalFavorites,
                    pilgrimage_days: pilgrimageDays,
                    first_checkin_date: firstCheckinDate
                },
                current_plans: {
                    ongoing: ongoingPlanData,
                    upcoming: upcomingPlanData
                },
                recent_activity: {
                    recent_checkins: recentCheckinsData,
                    recent_journals: recentJournalsData
                },
                stats_by_region: regionCounts,
                stats_by_type: typeCounts
            };
        } catch (error) {
            Logger.error('Get pilgrim dashboard overview error:', error);
            throw error;
        }
    }
}

module.exports = PilgrimDashboardService;
