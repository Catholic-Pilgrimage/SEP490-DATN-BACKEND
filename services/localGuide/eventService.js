const { User, Event } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

class LocalGuideEventService {
    /**
     * Generate event code: EVT[MMDD][SEQ]
     * Example: EVT0116001
     */
    static async generateEventCode() {
        const prefix = 'EVT';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestEvent = await Event.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestEvent && latestEvent.code) {
            const lastSeq = parseInt(latestEvent.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Create event
     */
    static async createEvent(userId, data, bannerUrl = null) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { name, description, start_date, end_date, start_time, end_time, location, category } = data;

            const code = await this.generateEventCode();

            const event = await Event.create({
                site_id: user.site_id,
                code,
                name,
                description,
                start_date,
                end_date: end_date || null,
                start_time: start_time || null,
                end_time: end_time || null,
                location: location || null,
                category: category || null,
                banner_url: bannerUrl,
                status: 'pending',
                created_by: userId
            });

            Logger.info(`Local Guide ${userId} created event ${event.code} for site ${user.site_id}`);

            // Notify Manager
            await NotificationService.notifySiteManager(user.site_id, 'event_submitted', {
                guideName: user.full_name || user.email,
                eventName: name
            });

            return event;
        } catch (error) {
            Logger.error('Create event error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY events with filter & pagination
     */
    static async getEvents(userId, filters = {}) {
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


            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await Event.count({ where });

            const events = await Event.findAll({
                where,
                order: [['start_date', 'ASC'], ['start_time', 'ASC']],
                limit,
                offset
            });

            return {
                data: events,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Get events error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update event (only own + pending/rejected)
     */
    static async updateEvent(userId, eventId, updateData, bannerUrl = null) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const event = await Event.findOne({
                where: {
                    id: eventId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status === 'approved') {
                throw new Error('Cannot update approved event');
            }

            const { name, description, start_date, end_date, start_time, end_time, location, category } = updateData;

            const dataToUpdate = {};

            if (name !== undefined) dataToUpdate.name = name;
            if (description !== undefined) dataToUpdate.description = description;
            if (start_date !== undefined) dataToUpdate.start_date = start_date;
            if (end_date !== undefined) dataToUpdate.end_date = end_date;
            if (start_time !== undefined) dataToUpdate.start_time = start_time;
            if (end_time !== undefined) dataToUpdate.end_time = end_time;
            if (location !== undefined) dataToUpdate.location = location;
            if (category !== undefined) dataToUpdate.category = category;
            if (bannerUrl) dataToUpdate.banner_url = bannerUrl;

            if (event.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
            }

            await event.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated event ${eventId}`);

            return event;
        } catch (error) {
            Logger.error('Update event error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Delete event (only own + pending/rejected) - Soft delete
     */
    static async deleteEvent(userId, eventId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const event = await Event.findOne({
                where: {
                    id: eventId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status === 'approved') {
                throw new Error('Cannot delete approved event');
            }

            // Soft delete
            await event.update({ is_active: false });

            Logger.info(`Local Guide ${userId} soft deleted event ${eventId}`);

            return { message: 'Event deleted successfully' };
        } catch (error) {
            Logger.error('Delete event error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Restore event (only own + pending/rejected)
     */
    static async restoreEvent(userId, eventId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const event = await Event.findOne({
                where: {
                    id: eventId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status === 'approved') {
                throw new Error('Cannot restore approved event');
            }

            if (event.is_active) {
                throw new Error('Event is already active');
            }

            // Restore
            await event.update({ is_active: true });

            Logger.info(`Local Guide ${userId} restored event ${eventId}`);

            return event;
        } catch (error) {
            Logger.error('Restore event error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideEventService;
