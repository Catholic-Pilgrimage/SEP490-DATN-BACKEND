const { PlannerItem, Site, UserCheckin, Planner, PlannerMember } = require('../models');
const OSRMUtil = require('../utils/osrm.util');

class CheckinService {
    static async notifyMembersAfterFirstCheckin(planner, plannerItem, currentUserId) {
        const NotificationService = require('./shared/notificationService');

        const joinedMembers = await PlannerMember.findAll({
            where: {
                planner_id: planner.id,
                join_status: 'joined'
            },
            attributes: ['user_id']
        });

        if (joinedMembers.length === 0) {
            return;
        }

        const participantIds = [...new Set([
            planner.user_id,
            ...joinedMembers.map(member => member.user_id)
        ])];

        const memberIds = participantIds.filter(memberId => memberId !== currentUserId);

        if (memberIds.length === 0) {
            return;
        }

        const checkedInMembers = await UserCheckin.findAll({
            where: {
                planner_item_id: plannerItem.id,
                user_id: memberIds,
                status: 'checked_in'
            },
            attributes: ['user_id']
        });

        const checkedInMemberIds = new Set(checkedInMembers.map(record => record.user_id));
        const pendingMemberIds = memberIds.filter(memberId => !checkedInMemberIds.has(memberId));

        if (pendingMemberIds.length === 0) {
            return;
        }

        await Promise.all(pendingMemberIds.map(memberId =>
            NotificationService.createNotification('planner_first_checkin', memberId, {
                plannerId: planner.id,
                plannerItemId: plannerItem.id,
                plannerName: planner.name || 'Planner',
                siteName: plannerItem.site?.name || 'diem den'
            }).catch(() => null)
        ));
    }

    static async getJoinedParticipantIds(plannerId, ownerId, options = {}) {
        const joinedMembers = await PlannerMember.findAll({
            where: {
                planner_id: plannerId,
                join_status: 'joined'
            },
            attributes: ['user_id'],
            transaction: options.transaction
        });

        return [...new Set([
            ownerId,
            ...joinedMembers.map(member => member.user_id)
        ].filter(Boolean))];
    }

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
                    attributes: ['id', 'user_id', 'name', 'status', 'end_date', 'started_at']
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
                throw new Error('You are not a member of this plan');
            }
        }

        // ===== VALIDATION: Planner status =====
        if (['completed', 'cancelled'].includes(planner.status)) {
            throw new Error(`The plan has been ${planner.status}, cannot check-in`);
        }

        // ===== VALIDATION: Planner status must be ongoing =====
        if (planner.status !== 'ongoing') {
            throw new Error('This plan has not started yet, cannot check-in');
        }

        // ===== VALIDATION: Planner item status =====
        // Chỉ cho phép check-in nếu item đang upcoming
        if (plannerItem.status !== 'upcoming') {
            throw new Error('This site has already been processed, cannot check-in');
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
            throw new Error('You have already checked-in at this site');
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
            order: [['leg_number', 'ASC'], ['order_index', 'ASC']],
            attributes: ['id', 'leg_number', 'order_index']
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
            throw new Error('Planner item does not belong to this planner');
        }

        // Kiểm tra xem tất cả items trước đó đã hoàn thành chưa (visited hoặc skipped)
        for (let i = 0; i < currentItemIndex; i++) {
            const previousItem = allPlannerItems[i];
            
            // Re-fetch previous item status because we only gathered id, leg_number, order_index
            const prevItemRecord = await PlannerItem.findByPk(previousItem.id, { attributes: ['status'] });
            
            if (prevItemRecord.status !== 'visited' && prevItemRecord.status !== 'skipped') {
                throw new Error(
                    `Sequential required: day ${previousItem.leg_number}, order ${previousItem.order_index}`
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
            throw new Error('Cannot calculate distance. Please try again.');
        }

        const distance = routeInfo.distance;

        // Reject check-in if distance > 500 meters
        if (distance > 500) {
            throw new Error(`Too far: distance ${Math.round(distance)}, radius 500`);
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

        let newPlannerStatus = planner.status;

        // Tự động mark 'visited' nếu TẤT CẢ mọi người (kể cả owner) đều đã check-in
        const participantIds = await this.getJoinedParticipantIds(planner.id, planner.user_id);
        const totalExpected = participantIds.length;

        const checkedInCount = await UserCheckin.count({
            where: {
                planner_item_id: plannerItemId,
                status: 'checked_in',
                user_id: participantIds
            }
        });

        if (checkedInCount === 1) {
            await this.notifyMembersAfterFirstCheckin(planner, plannerItem, userId);
        }

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
    static async skipItemByOwner(ownerId, plannerItemId, skipReason) {
        const plannerItem = await PlannerItem.findByPk(plannerItemId, {
            include: [
                {
                    model: Planner,
                    as: 'planner',
                    attributes: ['id', 'user_id', 'name', 'status']
                },
                {
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        const planner = plannerItem.planner;

        if (planner.user_id !== ownerId) {
            throw new Error('Only the Leader can perform this action');
        }

        if (['completed', 'cancelled'].includes(planner.status)) {
            throw new Error(`The plan has been ${planner.status}, cannot change site status`);
        }

        if (plannerItem.status === 'visited' || plannerItem.status === 'skipped') {
            throw new Error('This site is already closed, cannot change');
        }

        const checkedInCount = await UserCheckin.count({
            where: {
                planner_item_id: plannerItemId,
                status: 'checked_in'
            }
        });

        if (checkedInCount > 0) {
            throw new Error('Cannot skip site after a member has checked in');
        }

        const normalizedSkipReason = typeof skipReason === 'string' ? skipReason.trim() : '';
        if (!normalizedSkipReason) {
            throw new Error('Skip reason is required');
        }

        await plannerItem.update({
            status: 'skipped',
            skip_reason: normalizedSkipReason,
            skipped_at: new Date()
        });

        const PlannerService = require('./plannerService');
        const nextUpcomingItem = await PlannerService.getNextUpcomingPlannerItem(planner.id);
        const notificationType = nextUpcomingItem ? 'planner_item_skipped' : 'planner_item_skipped_last';

        await PlannerService.notifyOngoingPlannerMembers(planner, notificationType, {
            plannerId: planner.id,
            plannerName: planner.name || 'Planner',
            siteName: plannerItem.site?.name || 'diem den',
            nextSiteName: nextUpcomingItem?.site?.name || '',
            reason: normalizedSkipReason
        }, { excludeUserId: ownerId });

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
                throw new Error('Only the Leader can perform this action');
            }

            if (['completed', 'cancelled'].includes(planner.status)) {
                throw new Error(`The plan has been ${planner.status}, cannot change site status`);
            }

            // ===== VALIDATION: Planner status must be ongoing =====
            if (planner.status !== 'ongoing') {
                throw new Error('This plan is not active, cannot update site status');
            }

            if (plannerItem.status !== 'upcoming') {
                throw new Error('This site has already been processed, cannot update status');
            }

            // Lấy tất cả user đã tham gia chuyến đi
            const allUserIds = await this.getJoinedParticipantIds(planner.id, planner.user_id, {
                transaction: t
            });

            // Lấy những người đã check-in
            const checkedInUsers = await UserCheckin.findAll({
                where: {
                    planner_item_id: plannerItemId,
                    status: 'checked_in',
                    user_id: allUserIds
                },
                attributes: ['user_id'],
                transaction: t
            });
            const checkedInIds = new Set(checkedInUsers.map(c => c.user_id));

            // Tìm những người chưa check-in để gán missed
            const ownerCheckedIn = checkedInIds.has(planner.user_id);
            const hasOtherMemberCheckedIn = allUserIds.some(
                userId => userId !== planner.user_id && checkedInIds.has(userId)
            );

            if (!ownerCheckedIn) {
                throw new Error('Owner must check in before marking site as visited');
            }

            if (allUserIds.length > 1 && !hasOtherMemberCheckedIn) {
                throw new Error('At least one other member must check in before marking site as visited');
            }

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
                attributes: ['id', 'site_id', 'leg_number', 'order_index'],
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
                throw new Error('You do not have permission to view this progress');
            }
        }

        // Lấy tất cả items
        const items = await PlannerItem.findAll({
            where: { planner_id: plannerId },
            order: [['leg_number', 'ASC'], ['order_index', 'ASC']],
            include: [{
                model: Site,
                as: 'site',
                attributes: ['id', 'name', 'code']
            }]
        });

        // Lấy tất cả members + owner
        const allUserIds = await this.getJoinedParticipantIds(plannerId, planner.user_id);

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

        const plannerSkippedCount = items.filter(i => i.status === 'skipped').length;

        // Build kết quả
        const progressData = allUserIds.map(userId => {
            const userCheckins = checkinsByUser[userId] || [];
            const checkedCount = userCheckins.filter(c => c.status === 'checked_in').length;
            const missedCount = userCheckins.filter(c => c.status === 'missed').length;
            
            // Những điểm Trưởng đoàn bỏ qua (skipped) được tính là đã hoàn thành (không bị trừ % tiến độ)
            const completedCount = checkedCount + plannerSkippedCount;

            const checkinDetails = userCheckins.map(c => ({
                planner_item_id: c.planner_item_id,
                status: c.status,
                checkin_date: c.checkin_date
            }));

            return {
                user_id: userId,
                total_items: items.length,
                checked_in: checkedCount,
                skipped_by_planner: plannerSkippedCount,
                missed: missedCount,
                completed: completedCount,
                percent: items.length > 0 ? Math.round((completedCount) / items.length * 100) : 0,
                history: checkinDetails
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
