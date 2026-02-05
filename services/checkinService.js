const { PlannerItem, Site, UserCheckin } = require('../models');
const HaversineUtil = require('../utils/haversine.util');

class CheckinService {
    /**
     * Check in at a planner item with GPS validation
     * @param {string} userId - User ID from JWT
     * @param {string} plannerItemId - Planner item ID
     * @param {number} latitude - User's current latitude
     * @param {number} longitude - User's current longitude
     * @param {string} note - Optional check-in note
     * @returns {Promise<{distance: number, is_valid: boolean}>}
     */
    static async checkin(userId, plannerItemId, latitude, longitude, note) {
        // Fetch planner item with associated site
        const plannerItem = await PlannerItem.findByPk(plannerItemId, {
            include: [{
                model: Site,
                as: 'site',
                attributes: ['id', 'name', 'latitude', 'longitude']
            }]
        });

        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        const site = plannerItem.site;

        if (!site || !site.latitude || !site.longitude) {
            throw new Error('Site coordinates not available');
        }

        // Calculate distance using Haversine formula
        const distance = HaversineUtil.distance(
            latitude,
            longitude,
            parseFloat(site.latitude),
            parseFloat(site.longitude)
        );

        // Determine if check-in is valid (within 100 meters)
        const isValid = distance <= 100;

        // Try to create check-in (will fail if duplicate due to unique constraint)
        const [checkin, created] = await UserCheckin.findOrCreate({
            where: {
                user_id: userId,
                planner_item_id: plannerItemId
            },
            defaults: {
                user_id: userId,
                planner_item_id: plannerItemId,
                latitude: latitude,
                longitude: longitude,
                distance_meters: Math.round(distance),
                is_valid: isValid,
                note: note || null
            }
        });

        if (!created) {
            throw new Error('Bạn đã check-in điểm này rồi');
        }

        return {
            distance: Math.round(distance),
            is_valid: isValid
        };
    }
}

module.exports = CheckinService;
