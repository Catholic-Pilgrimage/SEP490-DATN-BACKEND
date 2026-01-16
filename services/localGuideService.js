const { User, Site, SiteMedia, MassSchedule } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');

class LocalGuideService {

    /**
     * Generate media code with format: [PREFIX][MMDD][SEQ]
     * Example: IMG0115001, VID0115002, PAN0115001
     */
    static async generateMediaCode(type) {
        const prefixMap = {
            image: 'IMG',
            video: 'VID',
            panorama: 'PAN'
        };
        const prefix = prefixMap[type] || 'MED';


        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;


        const latestMedia = await SiteMedia.findOne({
            where: {
                code: {
                    [require('sequelize').Op.like]: `${prefix}${dateStr}%`
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

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Get my site details
     */
    static async getMySite(userId) {
        try {
            const user = await User.findByPk(userId, {
                include: [{ model: Site, as: 'assignedSite' }]
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.role !== 'local_guide') {
                throw new Error('Only local guides can access this');
            }

            if (!user.site_id || !user.assignedSite) {
                throw new Error('Local Guide has no site assigned');
            }

            const site = user.assignedSite;

            return {
                id: site.id,
                code: site.code,
                name: site.name,
                description: site.description,
                history: site.history,
                address: site.address,
                province: site.province,
                district: site.district,
                latitude: site.latitude,
                longitude: site.longitude,
                region: site.region,
                type: site.type,
                patron_saint: site.patron_saint,
                cover_image: site.cover_image,
                opening_hours: site.opening_hours,
                contact_info: site.contact_info,
                is_active: site.is_active,
                created_at: site.created_at,
                updated_at: site.updated_at
            };
        } catch (error) {
            Logger.error('Get Local Guide site error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Upload Site Media (Image, Video, Panorama)
     * - File upload: image, video, panorama (via Cloudinary)
     * - URL: YouTube video link
     */
    static async uploadMedia(userId, fileData) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { url, type, caption } = fileData;


            if (!['image', 'video', 'panorama'].includes(type)) {
                throw new Error('Invalid media type');
            }


            if (type === 'video' && url && !url.includes('cloudinary')) {
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
                if (!youtubeRegex.test(url)) {
                    throw new Error('Invalid YouTube URL');
                }
            }


            const code = await this.generateMediaCode(type);

            const media = await SiteMedia.create({
                site_id: user.site_id,
                code,
                url,
                type,
                caption,
                status: 'pending',
                created_by: userId
            });

            Logger.info(`Local Guide ${userId} uploaded media ${media.code} (${type}) for site ${user.site_id}`);

            return media;
        } catch (error) {
            Logger.error('Upload media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY media with filter & pagination
     * Only shows media created by this user
     */
    static async getSiteMedia(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('Unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            // Filter by created_by (only show user's own media)
            const where = {
                site_id: user.site_id,
                created_by: userId
            };

            if (filters.type && ['image', 'video', 'panorama'].includes(filters.type)) {
                where.type = filters.type;
            }

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            const totalItems = await SiteMedia.count({ where });

            const mediaList = await SiteMedia.findAll({
                where,
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
            Logger.error('Get site media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Remove media (only own + pending/rejected)
     */
    static async deleteMedia(userId, mediaId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            // Only find media created by this user
            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot delete approved media');
            }

            await media.destroy();

            Logger.info(`Local Guide ${userId} deleted media ${mediaId}`);

            return { message: 'Media deleted successfully' };
        } catch (error) {
            Logger.error('Delete media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update media (only own + pending/rejected)
     * - Can update: caption, type, url (if YouTube video)
     * - Can replace file (if file upload)
     * - Rejected media: update + reset to pending for re-approval
     */
    static async updateMedia(userId, mediaId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            // Only find media created by this user
            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot update approved media');
            }

            const { url, type, caption } = updateData;

            const dataToUpdate = {};

            if (caption !== undefined) {
                dataToUpdate.caption = caption;
            }

            if (type && ['image', 'video', 'panorama'].includes(type)) {
                dataToUpdate.type = type;
            }

            if (url) {
                const mediaType = type || media.type;
                if (mediaType === 'video' && !url.includes('cloudinary')) {
                    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
                    if (!youtubeRegex.test(url)) {
                        throw new Error('Invalid YouTube URL');
                    }
                }
                dataToUpdate.url = url;
            }

            // If rejected, reset to pending for re-approval
            if (media.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
            }

            await media.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated media ${mediaId}`);

            return media;
        } catch (error) {
            Logger.error('Update media error:', error);
            throw error;
        }
    }



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

            // Validate days_of_week array
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

            // Filter by created_by (only show user's own schedules)
            const where = {
                site_id: user.site_id,
                created_by: userId
            };

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

            // Only find schedule created by this user
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

            // If rejected, reset to pending for re-approval
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
     * Local Guide: Delete schedule (only own + pending/rejected)
     */
    static async deleteSchedule(userId, scheduleId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            // Only find schedule created by this user
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

            await schedule.destroy();

            Logger.info(`Local Guide ${userId} deleted schedule ${scheduleId}`);

            return { message: 'Schedule deleted successfully' };
        } catch (error) {
            Logger.error('Delete schedule error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideService;
