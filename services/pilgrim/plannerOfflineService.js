const { Planner, PlannerItem, PlannerMember, Site, SiteMedia, MassSchedule, NearbyPlace, User } = require('../../models');
const Logger = require('../../utils/logger.util');

class PlannerOfflineService {
    /**
     * Bundle planner data for offline usage
     * Returns all necessary data for a planner to work offline
     */
    static async bundlePlannerData(plannerId, userId) {
        try {
            // 1. Get planner with basic info
            const planner = await Planner.findByPk(plannerId, {
                include: [
                    { model: User, as: 'owner', attributes: ['id', 'full_name', 'email'] }
                ]
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // 2. Check access permission (owner or member)
            if (planner.user_id !== userId) {
                const isMember = await PlannerMember.findOne({
                    where: { planner_id: plannerId, user_id: userId }
                });
                if (!isMember) {
                    throw new Error('Forbidden');
                }
            }

            // 3. Get all planner items
            const items = await PlannerItem.findAll({
                where: { planner_id: plannerId },
                order: [['leg_number', 'ASC'], ['order_index', 'ASC']],
                attributes: ['id', 'site_id', 'leg_number', 'order_index', 'note',
                    'estimated_time', 'rest_duration', 'travel_time_minutes', 'nearby_amenity_ids']
            });

            // 4. Get unique site IDs from items
            const siteIds = [...new Set(items.map(item => item.site_id))];

            // 5. Get all sites data (only approved and active)
            const sites = await Site.findAll({
                where: {
                    id: siteIds,
                    is_active: true
                },
                attributes: ['id', 'code', 'name', 'description', 'history', 'address',
                    'province', 'district', 'latitude', 'longitude', 'region', 'type',
                    'patron_saint', 'cover_image', 'opening_hours', 'contact_info']
            });

            // 6. Get site media (only approved and active)
            const siteMedia = await SiteMedia.findAll({
                where: {
                    site_id: siteIds,
                    status: 'approved',
                    is_active: true
                },
                attributes: ['id', 'site_id', 'url', 'type', 'caption', 'is_main']
            });

            // 7. Get mass schedules (only approved and active)
            const massSchedules = await MassSchedule.findAll({
                where: {
                    site_id: siteIds,
                    status: 'approved',
                    is_active: true
                },
                attributes: ['id', 'site_id', 'days_of_week', 'time', 'note']
            });

            // 8. Get nearby places (only approved and active)
            const nearbyPlaces = await NearbyPlace.findAll({
                where: {
                    site_id: siteIds,
                    status: 'approved',
                    is_active: true
                },
                attributes: ['id', 'site_id', 'name', 'category', 'address',
                    'latitude', 'longitude', 'distance_meters', 'phone', 'description']
            });

            // 9. Format items - convert rest_duration from INTERVAL object to string
            const formattedItems = items.map(item => {
                const json = item.toJSON();
                if (json.rest_duration && typeof json.rest_duration === 'object') {
                    const parts = [];
                    if (json.rest_duration.hours) parts.push(`${json.rest_duration.hours} hours`);
                    if (json.rest_duration.minutes) parts.push(`${json.rest_duration.minutes} minutes`);
                    json.rest_duration = parts.join(' ') || null;
                }
                return json;
            });

            // 10. Build final response - use flat arrays for mobile compatibility
            const response = {
                planner: {
                    id: planner.id,
                    name: planner.name,
                    start_date: planner.start_date,
                    end_date: planner.end_date,
                    number_of_days: planner.number_of_days,
                    number_of_people: planner.number_of_people,
                    transportation: planner.transportation,
                    status: planner.status,
                    owner: planner.owner ? {
                        id: planner.owner.id,
                        full_name: planner.owner.full_name,
                        email: planner.owner.email
                    } : null
                },
                items: formattedItems,
                sites: sites.map(site => site.toJSON()),
                site_media: siteMedia.map(media => media.toJSON()),
                mass_schedules: massSchedules.map(schedule => schedule.toJSON()),
                nearby_places: nearbyPlaces.map(place => place.toJSON()),
                sync_meta: {
                    generated_at: new Date().toISOString(),
                    bundle_version: 1,
                    total_sites: sites.length,
                    total_items: items.length
                }
            };

            Logger.info(`Offline data bundled for planner ${plannerId} by user ${userId}: ${sites.length} sites, ${items.length} items`);

            return response;
        } catch (error) {
            Logger.error('Bundle planner offline data error:', error);
            throw error;
        }
    }
}

module.exports = PlannerOfflineService;
