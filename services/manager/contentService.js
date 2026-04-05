const { User, Site, SiteMedia, MassSchedule, Event, GuideShift, NearbyPlace } = require('../../models');
const Logger = require('../../utils/logger.util');
const { Op } = require('sequelize');
const NotificationService = require('../shared/notificationService');

class ManagerContentService {

    // ===================== MEDIA =====================

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

            // By default, manager only reviews active media.
            const where = {
                site_id: user.site_id,
                is_active: true
            };

            if (filters.type && ['image', 'video', 'model_3d'].includes(filters.type)) {
                where.type = filters.type;
            }

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            // Filter by narrative_status (for 3D models with narratives)
            if (filters.narrative_status) {
                if (filters.narrative_status === 'null') {
                    where.narrative_status = null;
                } else if (['pending', 'approved', 'rejected'].includes(filters.narrative_status)) {
                    where.narrative_status = filters.narrative_status;
                }
            }

            // Filter by is_active (true/false/all)
            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await SiteMedia.count({ where });

            const mediaList = await SiteMedia.findAll({
                where,
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name', 'email']
                }, {
                    model: User,
                    as: 'mediaReviewer',
                    attributes: ['id', 'full_name', 'email']
                }, {
                    model: User,
                    as: 'narrativeReviewer',
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
     * Manager: Upload 3D Model for site
     */
    static async upload3DModel(userId, fileData) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const { url, caption } = fileData;

            if (!url) {
                throw new Error('File URL required');
            }

            // Generate code for model_3d
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${month}${day}`;

            const latestMedia = await SiteMedia.findOne({
                where: {
                    code: {
                        [Op.like]: `MDL${dateStr}%`
                    }
                },
                order: [['code', 'DESC']]
            });

            let sequence = 1;
            if (latestMedia && latestMedia.code) {
                const lastSeq = parseInt(latestMedia.code.slice(-3), 10);
                if (!isNaN(lastSeq)) {
                    sequence = lastSeq + 1;
                }
            }

            const code = `MDL${dateStr}${String(sequence).padStart(3, '0')}`;

            // Transaction: deactivate existing active model_3d + create new one
            const sequelize = SiteMedia.sequelize;
            const media = await sequelize.transaction(async (t) => {
                // Auto-deactivate all existing active model_3d of this site
                await SiteMedia.update(
                    { is_active: false },
                    {
                        where: {
                            site_id: user.site_id,
                            type: 'model_3d',
                            is_active: true
                        },
                        transaction: t
                    }
                );

                return await SiteMedia.create({
                    site_id: user.site_id,
                    code,
                    url,
                    type: 'model_3d',
                    caption,
                    status: 'approved',
                    created_by: userId
                }, { transaction: t });
            });

            Logger.info(`Manager ${userId} uploaded 3D model ${media.code} for site ${user.site_id} (old models auto-deactivated)`);

            return media;
        } catch (error) {
            Logger.error('Manager upload 3D model error:', error);
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

            if (status === 'rejected' && !rejectionReason) {
                throw new Error('Rejection reason required');
            }

            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    is_active: true
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status !== 'pending') {
                throw new Error('Already reviewed');
            }

            const updateData = {
                status,
                reviewed_by: userId,
                reviewed_at: new Date()
            };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            await media.update(updateData);

            // Notify LocalGuide who created the media
            if (media.created_by) {
                const site = await Site.findByPk(user.site_id);
                const notificationType = status === 'approved' ? 'media_approved' : 'media_rejected';
                await NotificationService.createNotification(notificationType, media.created_by, {
                    siteName: site?.name || '',
                    reason: rejectionReason || ''
                });

                // Notify users who favorited this site (only on approval)
                if (status === 'approved') {
                    await NotificationService.notifyFavoriteSiteUsers(user.site_id, 'media mới');
                }
            }

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

            // Auto-deactivate other model_3d when activating a model_3d
            if (isActive && media.type === 'model_3d') {
                const sequelize = SiteMedia.sequelize;
                await sequelize.transaction(async (t) => {
                    await SiteMedia.update(
                        { is_active: false },
                        {
                            where: {
                                site_id: user.site_id,
                                type: 'model_3d',
                                is_active: true,
                                id: { [Op.ne]: mediaId }
                            },
                            transaction: t
                        }
                    );
                    await media.update({ is_active: isActive }, { transaction: t });
                });
            } else {
                await media.update({ is_active: isActive });
            }

            const action = isActive ? 'restored' : 'deactivated';
            Logger.info(`Manager ${userId} ${action} media ${media.code}${isActive && media.type === 'model_3d' ? ' (other model_3d auto-deactivated)' : ''}`);

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

            if (filters.day_of_week !== undefined && filters.day_of_week !== null) {
                const dayNum = parseInt(filters.day_of_week);
                if (dayNum >= 0 && dayNum <= 6) {
                    where.days_of_week = { [Op.contains]: [dayNum] };
                }
            }
            // Filter by is_active (true/false/all)
            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await MassSchedule.count({ where });

            const scheduleList = await MassSchedule.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'full_name', 'email']
                    },
                    {
                        model: User,
                        as: 'scheduleReviewer',
                        attributes: ['id', 'full_name', 'email']
                    }
                ],
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

            const updateData = { status, reviewed_by: userId, reviewed_at: new Date() };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            await schedule.update(updateData);

            // Notify LocalGuide who created the schedule
            if (schedule.created_by) {
                const site = await Site.findByPk(user.site_id);
                const notificationType = status === 'approved' ? 'schedule_approved' : 'schedule_rejected';
                await NotificationService.createNotification(notificationType, schedule.created_by, {
                    siteName: site?.name || '',
                    reason: rejectionReason || ''
                });

                // Notify users who favorited this site (only on approval)
                if (status === 'approved') {
                    await NotificationService.notifyFavoriteSiteUsers(user.site_id, 'lịch lễ mới');
                }
            }

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

    // ===================== EVENTS =====================

    /**
     * Manager: Get all events of site with filter & pagination
     */
    static async getEvents(userId, filters = {}) {
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
            // Filter by is_active (true/false/all)
            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await Event.count({ where });

            const eventList = await Event.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'full_name', 'email']
                    },
                    {
                        model: User,
                        as: 'eventReviewer',
                        attributes: ['id', 'full_name', 'email']
                    }
                ],
                order: [['start_date', 'ASC']],
                limit,
                offset
            });

            return {
                data: eventList,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Manager get events error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update event status (approve/reject)
     */
    static async updateEventStatus(userId, eventId, status, rejectionReason = null) {
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

            const event = await Event.findOne({
                where: { id: eventId, site_id: user.site_id }
            });

            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status !== 'pending') {
                throw new Error('Already reviewed');
            }

            const updateData = { status, reviewed_by: userId, reviewed_at: new Date() };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            await event.update(updateData);

            // Notify LocalGuide who created the event
            if (event.created_by) {
                const notificationType = status === 'approved' ? 'event_approved' : 'event_rejected';
                await NotificationService.createNotification(notificationType, event.created_by, {
                    eventName: event.name || '',
                    reason: rejectionReason || ''
                });

                // Notify users who favorited this site (only on approval)
                if (status === 'approved') {
                    await NotificationService.notifyFavoriteSiteUsers(user.site_id, 'sự kiện mới');
                }
            }

            Logger.info(`Manager ${userId} ${status} event ${event.code}`);

            return event;
        } catch (error) {
            Logger.error('Manager update event status error:', error);
            throw error;
        }
    }

    /**
     * Manager: Toggle event active status (soft delete/restore)
     */
    static async toggleEventActive(userId, eventId, isActive) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const event = await Event.findOne({
                where: { id: eventId, site_id: user.site_id }
            });

            if (!event) {
                throw new Error('Event not found');
            }

            if (event.status !== 'approved') {
                throw new Error('Only approved event can be toggled');
            }

            await event.update({ is_active: isActive });

            const action = isActive ? 'restored' : 'deactivated';
            Logger.info(`Manager ${userId} ${action} event ${event.code}`);

            return event;
        } catch (error) {
            Logger.error('Manager toggle event active error:', error);
            throw error;
        }
    }

    // ===================== NEARBY PLACES =====================

    /**
     * Manager: Get nearby places list (for approval)
     */
    static async getNearbyPlaces(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'manager' || !user.site_id) {
                throw new Error('Unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = { site_id: user.site_id };

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }
            if (filters.category && ['food', 'lodging', 'medical'].includes(filters.category)) {
                where.category = filters.category;
            }
            // Filter by is_active (true/false/all)
            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const { count, rows } = await NearbyPlace.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'full_name', 'email']
                    },
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['id', 'full_name', 'email']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: rows,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            Logger.error('Manager get nearby places error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update nearby place status (approve/reject)
     */
    static async updateNearbyPlaceStatus(userId, placeId, status, rejectionReason = null) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'manager' || !user.site_id) {
                throw new Error('Unauthorized');
            }

            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Invalid status');
            }

            if (status === 'rejected' && !rejectionReason) {
                throw new Error('Rejection reason is required');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status !== 'pending') {
                throw new Error('Only pending nearby places can be reviewed');
            }

            await place.update({
                status,
                rejection_reason: status === 'rejected' ? rejectionReason : null,
                reviewed_by: userId,
                reviewed_at: new Date()
            });

            // Notify LocalGuide who created the nearby place
            if (place.created_by) {
                const site = await Site.findByPk(user.site_id);
                const notificationType = status === 'approved' ? 'nearby_place_approved' : 'nearby_place_rejected';
                await NotificationService.createNotification(notificationType, place.created_by, {
                    placeName: place.name || '',
                    siteName: site?.name || '',
                    reason: rejectionReason || ''
                });

                // Notify users who favorited this site (only on approval)
                if (status === 'approved') {
                    await NotificationService.notifyFavoriteSiteUsers(user.site_id, 'địa điểm lân cận mới');
                }
            }

            Logger.info(`Manager ${userId} ${status} nearby place ${place.code}`);

            return place;
        } catch (error) {
            Logger.error('Manager update nearby place status error:', error);
            throw error;
        }
    }

    /**
     * Manager: Toggle nearby place active status (soft delete/restore)
     */
    static async toggleNearbyPlaceActive(userId, placeId, isActive) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            const place = await NearbyPlace.findOne({
                where: { id: placeId, site_id: user.site_id }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status !== 'approved') {
                throw new Error('Only approved nearby place can be toggled');
            }

            await place.update({ is_active: isActive });

            const action = isActive ? 'restored' : 'deactivated';
            Logger.info(`Manager ${userId} ${action} nearby place ${place.code}`);

            return place;
        } catch (error) {
            Logger.error('Manager toggle nearby place active error:', error);
            throw error;
        }
    }

    // ===================== NARRATIVE STATUS =====================

    /**
     * Manager: Update narrative status (approve/reject)
     */
    static async updateNarrativeStatus(userId, mediaId, status, rejectionReason = null) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'manager') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Manager has no site');
            }

            if (!['approved', 'rejected'].includes(status)) {
                throw new Error('Invalid narrative status');
            }

            if (status === 'rejected' && !rejectionReason) {
                throw new Error('Narrative rejection reason required');
            }

            const media = await SiteMedia.findOne({
                where: { id: mediaId, site_id: user.site_id }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.type !== 'model_3d') {
                throw new Error('Not a 3D model');
            }

            if (media.narrative_status !== 'pending') {
                throw new Error('Narrative not pending');
            }

            if (!media.audio_url) {
                throw new Error('No narrative to review');
            }

            const updateData = {
                narrative_status: status,
                narrative_reviewed_by: userId,
                narrative_reviewed_at: new Date()
            };
            if (status === 'rejected') {
                updateData.narrative_rejection_reason = rejectionReason;
            } else {
                updateData.narrative_rejection_reason = null;
            }

            await media.update(updateData);

            // Notify LocalGuide who created the media
            if (media.created_by) {
                const site = await Site.findByPk(user.site_id);
                const notificationType = status === 'approved' ? 'narrative_approved' : 'narrative_rejected';
                await NotificationService.createNotification(notificationType, media.created_by, {
                    siteName: site?.name || '',
                    reason: rejectionReason || ''
                });
            }

            Logger.info(`Manager ${userId} ${status} narrative for media ${media.code}`);

            return media;
        } catch (error) {
            Logger.error('Manager update narrative status error:', error);
            throw error;
        }
    }

}

module.exports = ManagerContentService;
