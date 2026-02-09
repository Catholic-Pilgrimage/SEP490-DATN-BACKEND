const { User, MassSchedule } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

class LocalGuideScheduleService {
    /**
     * Generate schedule code: MS[MMDD][SEQ]
     * Example: MS0115001
     */
    static async generateScheduleCode() {
        const prefix = 'MS';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestSchedule = await MassSchedule.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestSchedule && latestSchedule.code) {
            const lastSeq = parseInt(latestSchedule.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Create mass schedule
     */
    static async createSchedule(userId, data) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { days_of_week, time, note } = data;

            if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
                throw new Error('days_of_week must be a non-empty array');
            }

            for (const day of days_of_week) {
                if (day < 0 || day > 6) {
                    throw new Error('Each day must be between 0 and 6');
                }
            }

            const code = await this.generateScheduleCode();

            const schedule = await MassSchedule.create({
                site_id: user.site_id,
                code,
                days_of_week,
                time,
                note,
                status: 'pending',
                created_by: userId
            });

            Logger.info(`Local Guide ${userId} created schedule ${schedule.code} for site ${user.site_id}`);

            // Notify Manager
            await NotificationService.notifySiteManager(user.site_id, 'schedule_submitted', {
                guideName: user.full_name || user.email
            });

            return schedule;
        } catch (error) {
            Logger.error('Create schedule error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY schedules with filter & pagination
     * Only shows schedules created by this user
     */
    static async getSchedules(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('Unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = {
                site_id: user.site_id,
                created_by: userId
            };

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            if (filters.day_of_week !== undefined && filters.day_of_week !== null) {
                const dayNum = parseInt(filters.day_of_week);
                if (dayNum >= 0 && dayNum <= 6) {
                    where.days_of_week = { [Op.contains]: [dayNum] };
                }
            }

            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await MassSchedule.count({ where });

            const schedules = await MassSchedule.findAll({
                where,
                order: [['time', 'ASC']],
                limit,
                offset
            });

            return {
                data: schedules,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Get schedules error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update schedule (only own + pending/rejected)
     * - Rejected schedule: update + reset to pending for re-approval
     */
    static async updateSchedule(userId, scheduleId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const schedule = await MassSchedule.findOne({
                where: {
                    id: scheduleId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            if (schedule.status === 'approved') {
                throw new Error('Cannot update approved schedule');
            }

            const { days_of_week, time, note } = updateData;

            const dataToUpdate = {};

            if (days_of_week !== undefined) {
                if (!Array.isArray(days_of_week) || days_of_week.length === 0) {
                    throw new Error('days_of_week must be a non-empty array');
                }
                for (const day of days_of_week) {
                    if (day < 0 || day > 6) {
                        throw new Error('Each day must be between 0 and 6');
                    }
                }
                dataToUpdate.days_of_week = days_of_week;
            }

            if (time !== undefined) {
                dataToUpdate.time = time;
            }

            if (note !== undefined) {
                dataToUpdate.note = note;
            }

            if (schedule.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
            }

            await schedule.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated schedule ${scheduleId}`);

            return schedule;
        } catch (error) {
            Logger.error('Update schedule error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Delete schedule (only own + pending/rejected) - Soft delete
     */
    static async deleteSchedule(userId, scheduleId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const schedule = await MassSchedule.findOne({
                where: {
                    id: scheduleId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            if (schedule.status === 'approved') {
                throw new Error('Cannot delete approved schedule');
            }

            // Soft delete
            await schedule.update({ is_active: false });

            Logger.info(`Local Guide ${userId} soft deleted schedule ${scheduleId}`);

            return { message: 'Schedule deleted successfully' };
        } catch (error) {
            Logger.error('Delete schedule error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Restore schedule (only own + pending/rejected)
     */
    static async restoreSchedule(userId, scheduleId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const schedule = await MassSchedule.findOne({
                where: {
                    id: scheduleId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!schedule) {
                throw new Error('Schedule not found');
            }

            if (schedule.status === 'approved') {
                throw new Error('Cannot restore approved schedule');
            }

            if (schedule.is_active) {
                throw new Error('Schedule is already active');
            }

            // Restore
            await schedule.update({ is_active: true });

            Logger.info(`Local Guide ${userId} restored schedule ${scheduleId}`);

            return schedule;
        } catch (error) {
            Logger.error('Restore schedule error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideScheduleService;
