const { User, Site, SiteMedia, MassSchedule } = require('../models');
const Logger = require('../utils/logger.util');
const { Op } = require('sequelize');

class ManagerContentService {



    /**
     * Manager: Get all media of site with filter & pagination
     */
    static async getMedia(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = { site_id: user.site_id };

            if (filters.type && ['image', 'video', 'panorama'].includes(filters.type)) {
                where.type = filters.type;
            }

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            const totalItems = await SiteMedia.count({ where });

            const mediaList = await SiteMedia.findAll({
                where,
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name', 'email']
                }],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: mediaList,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Manager get media error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update media status (approve/reject)
     */
    static async updateMediaStatus(userId, mediaId, status, rejectionReason = null) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Invalid status');
            }

            // Require rejection reason when rejecting
            if (status === 'rejected' && !rejectionReason) {
                throw new Error('Rejection reason required');
            }

            const media = await SiteMedia.findOne({
                where: { id: mediaId, site_id: user.site_id }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status !== 'pending') {
                throw new Error('Already reviewed');
            }

            const updateData = { status };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            await media.update(updateData);

            Logger.info(`Manager ${userId} ${status} media ${media.code}`);

            return media;
        } catch (error) {
            Logger.error('Manager update media status error:', error);
            throw error;
        }
    }

    /**
     * Manager: Toggle media active status (soft delete/restore)
     */
    static async toggleMediaActive(userId, mediaId, isActive) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const media = await SiteMedia.findOne({
                where: { id: mediaId, site_id: user.site_id }
            });

            if (!media) {
                throw new Error('Media not found');
            }


            if (media.status !== 'approved') {
                throw new Error('Only approved media can be toggled');
            }

            await media.update({ is_active: isActive });

            const action = isActive ? 'restored' : 'deactivated';
            Logger.info(`Manager ${userId} ${action} media ${media.code}`);

            return media;
        } catch (error) {
            Logger.error('Manager toggle media active error:', error);
            throw error;
        }
    }

    // ===================== SCHEDULES =====================

    /**
     * Manager: Get all schedules of site with filter & pagination
     */
    static async getSchedules(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = { site_id: user.site_id };

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            // Filter by day_of_week using array contains
            if (filters.day_of_week !== undefined && filters.day_of_week !== null) {
                const dayNum = parseInt(filters.day_of_week);
                if (dayNum >= 0 && dayNum <= 6) {
                    where.days_of_week = { [Op.contains]: [dayNum] };
                }
            }

            const totalItems = await MassSchedule.count({ where });

            const scheduleList = await MassSchedule.findAll({
                where,
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name', 'email']
                }],
                order: [['time', 'ASC']],
                limit,
                offset
            });

            return {
                data: scheduleList,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Manager get schedules error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update schedule status (approve/reject)
     */
    static async updateScheduleStatus(userId, scheduleId, status, rejectionReason = null) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Invalid status');
            }

            if (status === 'rejected' && !rejectionReason) {
                throw new Error('Rejection reason required');
            }

            const schedule = await MassSchedule.findOne({
                where: { id: scheduleId, site_id: user.site_id }
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            if (schedule.status !== 'pending') {
                throw new Error('Already reviewed');
            }

            const updateData = { status };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            await schedule.update(updateData);

            Logger.info(`Manager ${userId} ${status} schedule ${schedule.code}`);

            return schedule;
        } catch (error) {
            Logger.error('Manager update schedule status error:', error);
            throw error;
        }
    }

    /**
     * Manager: Toggle schedule active status (soft delete/restore)
     */
    static async toggleScheduleActive(userId, scheduleId, isActive) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const schedule = await MassSchedule.findOne({
                where: { id: scheduleId, site_id: user.site_id }
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            if (schedule.status !== 'approved') {
                throw new Error('Only approved schedule can be toggled');
            }

            await schedule.update({ is_active: isActive });

            const action = isActive ? 'restored' : 'deactivated';
            Logger.info(`Manager ${userId} ${action} schedule ${schedule.code}`);

            return schedule;
        } catch (error) {
            Logger.error('Manager toggle schedule active error:', error);
            throw error;
        }
    }

}

module.exports = ManagerContentService;
