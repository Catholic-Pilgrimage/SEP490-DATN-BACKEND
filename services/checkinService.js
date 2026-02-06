const { PlannerItem, Site, UserCheckin, Planner } = require('../models');
const OSRMUtil = require('../utils/osrm.util');

class CheckinService {
    /**
     * Check in at a planner item with GPS validation using VietMap walking distance
     * @param {string} userId - User ID from JWT
     * @param {string} plannerItemId - Planner item ID
     * @param {number} latitude - User's current latitude
     * @param {number} longitude - User's current longitude
     * @param {string} note - Optional check-in note
     * @returns {Promise<{distance: number, is_valid: boolean}>}
     */
    static async checkin(userId, plannerItemId, latitude, longitude, note) {
        // Fetch planner item with associated site and planner
        const plannerItem = await PlannerItem.findByPk(plannerItemId, {
            include: [
                {
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name', 'latitude', 'longitude']
                },
                {
                    model: Planner,
                    as: 'planner',
                    attributes: ['id', 'user_id', 'status', 'end_date', 'started_at']
                }
            ]
        });

        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        const planner = plannerItem.planner;

        // Check quyền sở hữu
        if (planner.user_id !== userId) {
            throw new Error('Không có quyền check-in kế hoạch này');
        }

        // Kiểm tra planner đã hết hạn chưa
        if (planner.end_date) {
            const now = new Date();
            const endDate = new Date(planner.end_date);
            endDate.setHours(23, 59, 59, 999);
            
            if (now > endDate) {
                throw new Error('Kế hoạch đã kết thúc, không thể check-in');
            }
        }

        const site = plannerItem.site;

        if (!site || !site.latitude || !site.longitude) {
            throw new Error('Site coordinates not available');
        }

        // Calculate walking distance using VietMap API
        const routeInfo = await OSRMUtil.getRouteInfo(
            { lat: latitude, lng: longitude },
            { lat: parseFloat(site.latitude), lng: parseFloat(site.longitude) },
            'foot' // Walking mode
        );

        if (!routeInfo || routeInfo.distance == null) {
            throw new Error('Không thể tính khoảng cách. Vui lòng thử lại.');
        }

        const distance = routeInfo.distance; // in meters

        // Reject check-in if distance > 100 meters
        if (distance > 100) {
            throw new Error(`Bạn cách địa điểm ${Math.round(distance)}m. Vui lòng đến gần hơn (trong bán kính 100m) để check-in.`);
        }

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
                is_valid: true, // Always true if we reach here (distance <= 100m)
                note: note || null
            }
        });

        if (!created) {
            throw new Error('Bạn đã check-in điểm này rồi');
        }

        // Tự động chuyển planner sang 'ongoing' nếu đây là check-in đầu tiên
        if (planner.status === 'planning' && !planner.started_at) {
            await planner.update({
                status: 'ongoing',
                started_at: new Date()
            });
        }

        return {
            distance: Math.round(distance),
            is_valid: true,
            planner_status: planner.status === 'planning' ? 'ongoing' : planner.status
        };
    }

    /**
     * Get user's check-in history
     * @param {string} userId - User ID from JWT
     * @returns {Promise<Array>} List of check-ins with site and planner info
     */
    static async getUserCheckins(userId) {
        const checkins = await UserCheckin.findAll({
            where: {
                user_id: userId
            },
            include: [{
                model: PlannerItem,
                as: 'plannerItem',
                attributes: ['id', 'site_id', 'day_number', 'order_index'],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude']
                }]
            }],
            order: [['checkin_date', 'DESC']]
        });

        return checkins.map(checkin => ({
            id: checkin.id,
            planner_item_id: checkin.planner_item_id,
            checkin_date: checkin.checkin_date,
            distance_meters: checkin.distance_meters,
            is_valid: checkin.is_valid,
            note: checkin.note,
            site: checkin.plannerItem?.site ? {
                id: checkin.plannerItem.site.id,
                name: checkin.plannerItem.site.name,
                code: checkin.plannerItem.site.code,
                province: checkin.plannerItem.site.province,
                latitude: checkin.plannerItem.site.latitude,
                longitude: checkin.plannerItem.site.longitude
            } : null
        }));
    }
}

module.exports = CheckinService;
