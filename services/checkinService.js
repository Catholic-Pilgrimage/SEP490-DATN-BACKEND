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

        // ===== VALIDATION: Planner phải có địa điểm cho TẤT CẢ các ngày =====
        if (planner.status === 'planning') {
            const PlannerService = require('./plannerService');
            const continuityCheck = await PlannerService.validatePlannerContinuity(planner.id);
            
            if (!continuityCheck.isValid) {
                const missingDaysStr = continuityCheck.missingDays.join(', ');
                throw new Error(
                    `Lịch trình chưa đầy đủ! Bạn phải thêm địa điểm cho tất cả ${continuityCheck.totalDays} ngày. ` +
                    `Hiện đang thiếu: Ngày ${missingDaysStr}. Vui lòng hoàn thiện lịch trình trước khi check-in.`
                );
            }
        }

        // ===== VALIDATION: Check-in phải theo thứ tự =====
        // Lấy tất cả items của planner, sorted by day_number, order_index
        const allPlannerItems = await PlannerItem.findAll({
            where: { planner_id: planner.id },
            order: [['day_number', 'ASC'], ['order_index', 'ASC']],
            attributes: ['id', 'day_number', 'order_index']
        });

        // Lấy tất cả check-ins đã có của user cho planner này
        const existingCheckins = await UserCheckin.findAll({
            where: { 
                user_id: userId,
                planner_item_id: allPlannerItems.map(item => item.id)
            },
            attributes: ['planner_item_id']
        });

        const checkedInItemIds = new Set(existingCheckins.map(c => c.planner_item_id));

        // Tìm item đang check-in trong danh sách sorted
        const currentItemIndex = allPlannerItems.findIndex(item => item.id === plannerItemId);
        
        if (currentItemIndex === -1) {
            throw new Error('Planner item không thuộc planner này');
        }

        // Kiểm tra xem tất cả items trước đó đã được check-in chưa
        for (let i = 0; i < currentItemIndex; i++) {
            if (!checkedInItemIds.has(allPlannerItems[i].id)) {
                const previousItem = allPlannerItems[i];
                throw new Error(
                    `Bạn phải check-in theo thứ tự! Vui lòng check-in địa điểm Ngày ${previousItem.day_number}, thứ tự ${previousItem.order_index} trước.`
                );
            }
        }
        // ===== END: Validation =====

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
        let newStatus = planner.status;
        
        if (planner.status === 'planning' && !planner.started_at) {
            await planner.update({
                status: 'ongoing',
                started_at: new Date()
            });
            newStatus = 'ongoing';
        }

        // ===== Tự động chuyển sang 'completed' nếu check-in đủ tất cả items =====
        const totalItems = allPlannerItems.length;
        const totalCheckedIn = checkedInItemIds.size + 1; // +1 vì vừa mới check-in

        if (totalCheckedIn === totalItems && newStatus === 'ongoing') {
            await planner.update({
                status: 'completed',
                completed_at: new Date()
            });
            newStatus = 'completed';
        }
        // ===== END: Tự động complete =====

        return {
            distance: Math.round(distance),
            is_valid: true,
            planner_status: newStatus,
            total_items: totalItems,
            checked_in_items: totalCheckedIn,
            is_completed: newStatus === 'completed'
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
