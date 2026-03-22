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
        // Chỉ cho phép check-in nếu item đang in_progress
        if (plannerItem.status !== 'in_progress') {
            throw new Error('Địa điểm này chưa bắt đầu hoặc đã đóng, không thể check-in');
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

        // Kiểm tra xem tất cả items trước đó đã hoàn thành chưa (visited hoặc skipped)
        for (let i = 0; i < currentItemIndex; i++) {
            const previousItem = allPlannerItems[i];
            
            // Re-fetch previous item status because we only gathered id, day_number, order_index
            const prevItemRecord = await PlannerItem.findByPk(previousItem.id, { attributes: ['status'] });
            
            if (prevItemRecord.status !== 'visited' && prevItemRecord.status !== 'skipped') {
                throw new Error(
                    `Bạn phải thực hiện tuần tự! Địa điểm Ngày ${previousItem.day_number}, thứ tự ${previousItem.order_index} vẫn chưa hoàn thành.`
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

        // Tự động chuyển planner sang 'ongoing' nếu đây là check-in đầu tiên
        let newPlannerStatus = planner.status;
        if (planner.status === 'planning' && !planner.started_at) {
            await planner.update({
                status: 'ongoing',
                started_at: new Date()
            });
            newPlannerStatus = 'ongoing';
        }

        // Tự động mark 'visited' nếu TẤT CẢ mọi người (kể cả owner) đều đã check-in
        const membersCount = await PlannerMember.count({ 
            where: { planner_id: planner.id, join_status: 'joined' } 
        });
        const totalExpected = membersCount + 1; // +1 cho owner

        const checkedInCount = await UserCheckin.count({
            where: { planner_item_id: plannerItemId, status: 'checked_in' }
        });

        if (checkedInCount >= totalExpected) {
            await plannerItem.update({ status: 'visited' });
            
            // Check xem còn phải điểm cuối không
            const allItems = await PlannerItem.findAll({ 
                where: { planner_id: planner.id }, 
                attributes: ['status'] 
            });
            const allFinished = allItems.every(i => i.status === 'visited' || i.status === 'skipped');
            if (allFinished && newPlannerStatus !== 'completed') {
                await planner.update({ status: 'completed', completed_at: new Date() });
                newPlannerStatus = 'completed';
                Logger.info(`Planner ${planner.id} auto-completed after final check-in by all members`);
            }
        }

        return {
            distance: Math.round(distance),
            is_valid: true,
            planner_status: newPlannerStatus,
            message: 'Check-in thành công'
        };
    }

    /**
     * Bỏ qua cả địa điểm (Chỉ dành cho Trưởng đoàn). Áp dụng cho cả đoàn, không mất cọc.
     */
    static async skipItemByOwner(ownerId, plannerItemId) {
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

        if (planner.user_id !== ownerId) {
            throw new Error('Chỉ Trưởng đoàn mới có quyền bỏ qua địa điểm này');
        }

        if (plannerItem.status === 'visited' || plannerItem.status === 'skipped') {
            throw new Error('Địa điểm này đã chốt sổ, không thể thay đổi');
        }

        // Lấy tất cả members đang tham gia
        const members = await PlannerMember.findAll({
            where: { planner_id: planner.id, join_status: 'joined' },
            attributes: ['user_id']
        });
        const allUserIds = [planner.user_id, ...members.map(m => m.user_id)];

        // Lấy những ai đã có record (checked_in hoặc skipped)
        const existing = await UserCheckin.findAll({
            where: { planner_item_id: plannerItemId },
            attributes: ['user_id']
        });
        const existingIds = new Set(existing.map(c => c.user_id));

        // Tạo record 'skipped' cho những ai chưa có
        const toInsert = allUserIds
            .filter(id => !existingIds.has(id))
            .map(uid => ({
                id: require('crypto').randomUUID(),
                user_id: uid,
                planner_item_id: plannerItemId,
                status: 'skipped',
                note: 'Trưởng đoàn quyết định bỏ qua địa điểm này'
            }));

        if (toInsert.length > 0) {
            await UserCheckin.bulkCreate(toInsert);
        }

        await plannerItem.update({ status: 'skipped' });

        return { message: 'Đã đánh dấu bỏ qua địa điểm này cho toàn đoàn' };
    }

    /**
     * Hoàn thành điểm đến (Chỉ Trưởng đoàn). Đánh dấu 'visited' và quét 'missed' những ai chưa check-in.
     */
    static async completeItem(ownerId, plannerItemId) {
        const sequelize = require('../config/database');
        const t = await sequelize.transaction();

        try {
            const plannerItem = await PlannerItem.findByPk(plannerItemId, {
                include: [{
                    model: Planner,
                    as: 'planner',
                    attributes: ['id', 'user_id', 'status']
                }],
                transaction: t
            });

            if (!plannerItem) {
                throw new Error('Planner item not found');
            }

            const planner = plannerItem.planner;

            if (planner.user_id !== ownerId) {
                throw new Error('Chỉ Trưởng đoàn mới có quyền hoàn thành địa điểm này');
            }

            if (plannerItem.status !== 'in_progress') {
                throw new Error('Địa điểm này chưa bắt đầu hoặc đã kết thúc, không thể hoàn thành');
            }

            // Lấy tất cả user đã tham gia chuyến đi
            const members = await PlannerMember.findAll({
                where: { planner_id: planner.id, join_status: 'joined' },
                attributes: ['user_id'],
                transaction: t
            });
            const allUserIds = [planner.user_id, ...members.map(m => m.user_id)];

            // Lấy những người đã check-in
            const checkedInUsers = await UserCheckin.findAll({
                where: {
                    planner_item_id: plannerItemId,
                    status: 'checked_in'
                },
                attributes: ['user_id'],
                transaction: t
            });
            const checkedInIds = new Set(checkedInUsers.map(c => c.user_id));

            // Tìm những người chưa check-in để gán missed
            const missingUsers = allUserIds.filter(id => !checkedInIds.has(id));

            if (missingUsers.length > 0) {
                const missedRecords = missingUsers.map(uid => ({
                    id: require('crypto').randomUUID(),
                    user_id: uid,
                    planner_item_id: plannerItemId,
                    status: 'missed',
                    note: 'Hệ thống tự động ghi vắng mặt khi trưởng đoàn chốt sổ'
                }));
                await UserCheckin.bulkCreate(missedRecords, { transaction: t });
            }

            // Update item to visited
            await plannerItem.update({ status: 'visited' }, { transaction: t });

            // Autocomplete planner if this was the last item
            const allItems = await PlannerItem.findAll({ where: { planner_id: planner.id }, attributes: ['status'], transaction: t });
            const allFinished = allItems.every(i => i.status === 'visited' || i.status === 'skipped');
            if (allFinished) {
                await planner.update({ status: 'completed', completed_at: new Date() }, { transaction: t });
            }

            await t.commit();

            return { 
                message: 'Đã hoàn thành điểm đến', 
                stats: { checked_in: checkedInIds.size, missed: missingUsers.length } 
            };
        } catch (error) {
            await t.rollback();
            throw error;
        }
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
            const missedCount = userCheckins.filter(c => c.status === 'missed').length;

            return {
                user_id: userId,
                total_items: items.length,
                checked_in: checkedCount,
                missed: missedCount,
                completed: checkedCount,
                percent: items.length > 0 ? Math.round((checkedCount) / items.length * 100) : 0
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
