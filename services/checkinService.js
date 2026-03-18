const { PlannerItem, Site, UserCheckin, Planner, PlannerMember } = require('../models');
const OSRMUtil = require('../utils/osrm.util');

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

        // ===== KIỂM TRA USER LÀ THÀNH VIÊN CỦA PLANNER =====
        // User phải là owner hoặc có trong planner_members
        const isOwner = planner.user_id === userId;
        
        if (!isOwner) {
            const member = await PlannerMember.findOne({
                where: {
                    planner_id: planner.id,
                    user_id: userId
                }
            });
            
            if (!member) {
                throw new Error('Bạn không phải thành viên của kế hoạch này');
            }
        }

        // ===== VALIDATION: Planner item status =====
        // Kiểm tra item không được skipped
        if (plannerItem.status === 'skipped') {
            throw new Error('Địa điểm này đã bị bỏ qua, không thể check-in');
        }

        // Kiểm tra user đã check-in rồi thì không cho check-in lại
        const existingCheckin = await UserCheckin.findOne({
            where: {
                user_id: userId,
                planner_item_id: plannerItemId,
                status: 'checked_in'
            }
        });

        if (existingCheckin) {
            throw new Error('Bạn đã check-in địa điểm này rồi');
        }

        // Kiểm tra planner đã hết hạn chưa - BỎ vì không cần ngày cố định
        // if (planner.end_date) {
        //     const now = new Date();
        //     const endDate = new Date(planner.end_date);
        //     endDate.setHours(23, 59, 59, 999);
        //     
        //     if (now > endDate) {
        //         throw new Error('Kế hoạch đã kết thúc, không thể check-in');
        //     }
        // }

        // ===== VALIDATION: Planner phải có địa điểm cho TẤT CẢ các ngày - BỎ vì không cần ngày cố định =====
        // if (planner.status === 'planning') {
        //     const PlannerService = require('./plannerService');
        //     const continuityCheck = await PlannerService.validatePlannerContinuity(planner.id);
        //     
        //     if (!continuityCheck.isValid) {
        //         const missingDaysStr = continuityCheck.missingDays.join(', ');
        //         throw new Error(
        //             `Lịch trình chưa đầy đủ! Bạn phải thêm địa điểm cho tất cả ${continuityCheck.totalDays} ngày. ` +
        //             `Hiện đang thiếu: Ngày ${missingDaysStr}. Vui lòng hoàn thiện lịch trình trước khi check-in.`
        //         );
        //     }
        // }

        // ===== VALIDATION: Check-in phải theo thứ tự =====
        const allPlannerItems = await PlannerItem.findAll({
            where: { planner_id: planner.id },
            order: [['day_number', 'ASC'], ['order_index', 'ASC']],
            attributes: ['id', 'day_number', 'order_index']
        });

        // Lấy tất cả check-ins đã có của user cho planner này (trừ skipped/missed/absent)
        const userCheckins = await UserCheckin.findAll({
            where: { 
                user_id: userId,
                planner_item_id: allPlannerItems.map(item => item.id),
                status: 'checked_in'
            },
            attributes: ['planner_item_id']
        });

        const checkedInItemIds = new Set(userCheckins.map(c => c.planner_item_id));

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

        const site = plannerItem.site;

        if (!site || !site.latitude || !site.longitude) {
            throw new Error('Site coordinates not available');
        }

        // ===== TÍNH KHOẢNG CÁCH VỚI GPS =====
        const routeInfo = await OSRMUtil.getRouteInfo(
            { lat: latitude, lng: longitude },
            { lat: parseFloat(site.latitude), lng: parseFloat(site.longitude) },
            'foot'
        );

        if (!routeInfo || routeInfo.distance == null) {
            throw new Error('Không thể tính khoảng cách. Vui lòng thử lại.');
        }

        const distance = routeInfo.distance;

        // Reject check-in if distance > 500 meters
        if (distance > 500) {
            throw new Error(`Bạn cách địa điểm ${Math.round(distance)}m. Vui lòng đến gần hơn (trong bán kính 500m) để check-in.`);
        }

        // ===== TẠO HOẶC CẬP NHẬT CHECK-IN =====
        // Check-in với status 'checked_in'
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
                is_valid: true,
                status: 'checked_in',
                note: note || null
            }
        });

        if (!created) {
            // Nếu đã tồn tại nhưng status khác 'checked_in', cập nhật
            await checkin.update({
                latitude: latitude,
                longitude: longitude,
                distance_meters: Math.round(distance),
                is_valid: true,
                status: 'checked_in',
                note: note || null,
                checkin_date: new Date()
            });
        }

        // ===== CẬP NHẬT PLANNER ITEM STATUS =====
        await this.updatePlannerItemStatus(plannerItemId, planner.id);

        // ===== TỰ ĐỘNG CHUYỂN PLANNER SANG 'ongoing' NẾU ĐÂY LÀ CHECK-IN ĐẦU TIÊN =====
        let newPlannerStatus = planner.status;
        
        if (planner.status === 'planning' && !planner.started_at) {
            await planner.update({
                status: 'ongoing',
                started_at: new Date()
            });
            newPlannerStatus = 'ongoing';
        }

        // ===== TỰ ĐỘNG CHUYỂN SANG 'completed' NẾU TẤT CẢ THÀNH VIÊN ĐÃ HOÀN THÀNH =====
        await this.checkAndUpdatePlannerCompletion(planner.id);

        return {
            distance: Math.round(distance),
            is_valid: true,
            planner_status: newPlannerStatus,
            message: 'Check-in thành công'
        };
    }

    /**
     * Skip a planner item (user chủ động không đi điểm này)
     */
    static async skipItem(userId, plannerItemId, reason) {
        const plannerItem = await PlannerItem.findByPk(plannerItemId, {
            include: [{
                model: Planner,
                as: 'planner',
                attributes: ['id', 'user_id', 'status']
            }]
        });

        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        const planner = plannerItem.planner;

        // Kiểm tra user là thành viên
        const isOwner = planner.user_id === userId;
        
        if (!isOwner) {
            const member = await PlannerMember.findOne({
                where: {
                    planner_id: planner.id,
                    user_id: userId
                }
            });
            
            if (!member) {
                throw new Error('Bạn không phải thành viên của kế hoạch này');
            }
        }

        // Kiểm tra đã check-in chưa
        const existingCheckin = await UserCheckin.findOne({
            where: {
                user_id: userId,
                planner_item_id: plannerItemId
            }
        });

        if (existingCheckin && existingCheckin.status === 'checked_in') {
            throw new Error('Bạn đã check-in rồi, không thể bỏ qua');
        }

        // Tạo hoặc cập nhật check-in status thành 'skipped'
        if (existingCheckin) {
            await existingCheckin.update({
                status: 'skipped',
                note: reason || 'Người dùng chủ động bỏ qua'
            });
        } else {
            await UserCheckin.create({
                user_id: userId,
                planner_item_id: plannerItemId,
                status: 'skipped',
                note: reason || 'Người dùng chủ động bỏ qua'
            });
        }

        // Cập nhật planner item status
        await this.updatePlannerItemStatus(plannerItemId, planner.id);

        return { message: 'Đã đánh dấu bỏ qua địa điểm này' };
    }

    /**
     * Cập nhật status của planner_item dựa trên tất cả user_checkins
     * Logic:
     * - Nếu tất cả đều checked_in → 'checked_in'
     * - Nếu có ít nhất 1 checked_in → 'in_progress'
     * - Nếu tất cả skipped/missed/absent → 'skipped'
     */
    static async updatePlannerItemStatus(plannerItemId, plannerId) {
        const allMembers = await PlannerMember.findAll({
            where: { planner_id: plannerId },
            attributes: ['user_id']
        });
        
        // Thêm owner vào danh sách
        const planner = await Planner.findByPk(plannerId);
        const allUserIds = [planner.user_id, ...allMembers.map(m => m.user_id)];

        const userCheckins = await UserCheckin.findAll({
            where: {
                planner_item_id: plannerItemId,
                user_id: allUserIds
            }
        });

        const checkinByUser = {};
        userCheckins.forEach(c => {
            checkinByUser[c.user_id] = c.status;
        });

        // Đếm số lượng theo từng trạng thái
        let checkedInCount = 0;
        let pendingCount = 0;
        let skippedCount = 0;
        let missedCount = 0;
        let absentCount = 0;

        allUserIds.forEach(userId => {
            const status = checkinByUser[userId];
            if (status === 'checked_in') checkedInCount++;
            else if (status === 'skipped') skippedCount++;
            else if (status === 'missed') missedCount++;
            else if (status === 'absent') absentCount++;
            else pendingCount++;
        });

        const totalMembers = allUserIds.length;
        let newStatus;

        if (checkedInCount === totalMembers) {
            newStatus = 'checked_in';
        } else if (checkedInCount > 0) {
            newStatus = 'in_progress';
        } else if (skippedCount + missedCount + absentCount === totalMembers) {
            newStatus = 'skipped';
        } else {
            newStatus = 'planned';
        }

        await PlannerItem.update(
            { status: newStatus },
            { where: { id: plannerItemId } }
        );

        return newStatus;
    }

    /**
     * Kiểm tra và cập nhật planner sang completed nếu tất cả thành viên đã hoàn thành
     */
    static async checkAndUpdatePlannerCompletion(plannerId) {
        const planner = await Planner.findByPk(plannerId, {
            include: [{
                model: PlannerItem,
                as: 'items',
                attributes: ['id', 'status']
            }]
        });

        if (!planner || planner.status !== 'ongoing') {
            return;
        }

        // Lấy tất cả members
        const allMembers = await PlannerMember.findAll({
            where: { planner_id: plannerId },
            attributes: ['user_id']
        });
        const allUserIds = [planner.user_id, ...allMembers.map(m => m.user_id)];

        // Lấy tất cả items
        const allItems = planner.items || [];
        const allItemIds = allItems.map(item => item.id);

        if (allItemIds.length === 0) return;

        // Với mỗi user, kiểm tra đã hoàn thành chưa
        let allMembersCompleted = true;

        for (const userId of allUserIds) {
            const userCheckins = await UserCheckin.findAll({
                where: {
                    user_id: userId,
                    planner_item_id: allItemIds
                }
            });

            const checkedItemIds = new Set(
                userCheckins
                    .filter(c => c.status === 'checked_in' || c.status === 'skipped')
                    .map(c => c.planner_item_id)
            );

            // User phải check-in hoặc skip tất cả items
            if (checkedItemIds.size < allItemIds.length) {
                allMembersCompleted = false;
                break;
            }
        }

        if (allMembersCompleted) {
            await planner.update({
                status: 'completed',
                completed_at: new Date()
            });
        }

        return allMembersCompleted;
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
            status: checkin.status,
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

    /**
     * Lấy tiến độ của tất cả thành viên trong planner
     */
    static async getPlannerProgress(plannerId, requesterId) {
        const planner = await Planner.findByPk(plannerId);

        if (!planner) {
            throw new Error('Planner not found');
        }

        // Kiểm tra quyền xem
        const isOwner = planner.user_id === requesterId;
        
        if (!isOwner) {
            const member = await PlannerMember.findOne({
                where: {
                    planner_id: plannerId,
                    user_id: requesterId
                }
            });
            
            if (!member) {
                throw new Error('Bạn không có quyền xem tiến độ này');
            }
        }

        // Lấy tất cả items
        const items = await PlannerItem.findAll({
            where: { planner_id: plannerId },
            order: [['day_number', 'ASC'], ['order_index', 'ASC']],
            include: [{
                model: Site,
                as: 'site',
                attributes: ['id', 'name', 'code']
            }]
        });

        // Lấy tất cả members + owner
        const members = await PlannerMember.findAll({
            where: { planner_id: plannerId }
        });

        const allUserIds = [planner.user_id, ...members.map(m => m.user_id)];

        // Lấy check-ins của tất cả users
        const allCheckins = await UserCheckin.findAll({
            where: {
                planner_item_id: items.map(i => i.id)
            }
        });

        // Nhóm check-ins theo user
        const checkinsByUser = {};
        allUserIds.forEach(uid => {
            checkinsByUser[uid] = allCheckins.filter(c => c.user_id === uid);
        });

        // Build kết quả
        const progressData = allUserIds.map(userId => {
            const userCheckins = checkinsByUser[userId] || [];
            const checkedCount = userCheckins.filter(c => c.status === 'checked_in').length;
            const skippedCount = userCheckins.filter(c => c.status === 'skipped').length;
            const missedCount = userCheckins.filter(c => c.status === 'missed').length;
            const absentCount = userCheckins.filter(c => c.status === 'absent').length;

            return {
                user_id: userId,
                total_items: items.length,
                checked_in: checkedCount,
                skipped: skippedCount,
                missed: missedCount,
                absent: absentCount,
                completed: checkedCount + skippedCount,
                percent: items.length > 0 ? Math.round((checkedCount + skippedCount) / items.length * 100) : 0
            };
        });

        return {
            planner_status: planner.status,
            total_items: items.length,
            total_members: allUserIds.length,
            member_progress: progressData
        };
    }
}

module.exports = CheckinService;
