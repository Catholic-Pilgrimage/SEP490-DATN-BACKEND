const { User, Site, SiteMedia, MassSchedule, Event, GuideShift, GuideShiftSubmission, NearbyPlace } = require('../models');
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

    // ===================== EVENTS =====================

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

            const { name, description, start_date, end_date, start_time, end_time, location } = data;

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
                banner_url: bannerUrl,
                status: 'pending',
                created_by: userId
            });

            Logger.info(`Local Guide ${userId} created event ${event.code} for site ${user.site_id}`);

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

            const { name, description, start_date, end_date, start_time, end_time, location } = updateData;

            const dataToUpdate = {};

            if (name !== undefined) dataToUpdate.name = name;
            if (description !== undefined) dataToUpdate.description = description;
            if (start_date !== undefined) dataToUpdate.start_date = start_date;
            if (end_date !== undefined) dataToUpdate.end_date = end_date;
            if (start_time !== undefined) dataToUpdate.start_time = start_time;
            if (end_time !== undefined) dataToUpdate.end_time = end_time;
            if (location !== undefined) dataToUpdate.location = location;
            if (bannerUrl) dataToUpdate.banner_url = bannerUrl;

            // If rejected, reset to pending
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
     * Local Guide: Delete event (only own + pending/rejected)
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

            await event.destroy();

            Logger.info(`Local Guide ${userId} deleted event ${eventId}`);

            return { message: 'Event deleted successfully' };
        } catch (error) {
            Logger.error('Delete event error:', error);
            throw error;
        }
    }
    // ===================== SHIFT SUBMISSIONS =====================

    /**
     * Generate shift submission code: SHF[MMDD][SEQ]
     * Example: SHF0121001
     */
    static async generateShiftSubmissionCode() {
        const prefix = 'SHF';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestSubmission = await GuideShiftSubmission.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestSubmission && latestSubmission.code) {
            const lastSeq = parseInt(latestSubmission.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Create Shift Submission
     * Creates a new submission with shifts for a specific week
     */
    static async createSubmission(userId, data) {
        const { week_start_date, shifts, previous_submission_id, change_reason } = data;

        const user = await User.findByPk(userId);
        if (!user || !user.site_id) {
            throw new Error('Local Guide not assigned to any site');
        }

        const site = await Site.findByPk(user.site_id);
        if (!site) {
            throw new Error('Site not found');
        }

        // Check if there's already a pending submission for this week
        const pendingSubmission = await GuideShiftSubmission.findOne({
            where: {
                guide_id: userId,
                site_id: user.site_id,
                week_start_date,
                status: 'pending',
                is_active: true
            }
        });

        if (pendingSubmission) {
            throw new Error('You already have a pending submission for this week. Please update it or wait for approval.');
        }

        // Check if there's already an approved submission for this week
        const approvedSubmission = await GuideShiftSubmission.findOne({
            where: {
                guide_id: userId,
                site_id: user.site_id,
                week_start_date,
                status: 'approved',
                is_active: true
            }
        });


        let submissionType = 'new';
        if (previous_submission_id) {
            submissionType = 'update';
            if (!change_reason) {
                throw new Error('Change reason is required when updating approved schedule');
            }
        } else if (approvedSubmission) {

            throw new Error('You already have an approved schedule for this week. To update, please provide previous_submission_id and change_reason.');
        }

        // Validate shifts
        const normalizeTime = (time) => {
            return time.length === 5 ? `${time}:00` : time;
        };

        const validatedShifts = [];
        const errors = [];

        for (let i = 0; i < shifts.length; i++) {
            const { day_of_week, start_time, end_time } = shifts[i];

            try {
                const normalizedStart = normalizeTime(start_time);
                const normalizedEnd = normalizeTime(end_time);


                const start = new Date(`1970-01-01T${normalizedStart}`);
                const end = new Date(`1970-01-01T${normalizedEnd}`);
                let durationHours = (end - start) / (1000 * 60 * 60);
                if (durationHours < 0) durationHours += 24;

                if (durationHours > 12) {
                    errors.push({ index: i, day_of_week, error: 'Shift duration cannot exceed 12 hours' });
                    continue;
                }

                if (durationHours <= 0) {
                    errors.push({ index: i, day_of_week, error: 'Shift duration must be greater than 0' });
                    continue;
                }

                // Validate opening hours if set
                if (site.opening_hours) {
                    const siteOpen = site.opening_hours.open;
                    const siteClose = site.opening_hours.close;
                    if (siteOpen && siteClose) {
                        const normalizedSiteOpen = normalizeTime(siteOpen);
                        const normalizedSiteClose = normalizeTime(siteClose);
                        if (normalizedStart < normalizedSiteOpen) {
                            errors.push({ index: i, day_of_week, error: `Shift must start after site opening (${siteOpen})` });
                            continue;
                        }
                        if (normalizedEnd > normalizedSiteClose) {
                            errors.push({ index: i, day_of_week, error: `Shift must end before site closing (${siteClose})` });
                            continue;
                        }
                    }
                }

                // Check self-overlap
                const selfOverlap = validatedShifts.some(s =>
                    s.day_of_week === day_of_week &&
                    s.start_time < normalizedEnd &&
                    s.end_time > normalizedStart
                );

                if (selfOverlap) {
                    errors.push({ index: i, day_of_week, error: 'Shift overlaps with another shift in this request' });
                    continue;
                }

                validatedShifts.push({
                    day_of_week,
                    start_time: normalizedStart,
                    end_time: normalizedEnd
                });

            } catch (err) {
                errors.push({ index: i, day_of_week, error: err.message });
            }
        }

        if (validatedShifts.length === 0) {
            throw new Error('No valid shifts provided');
        }


        const otherSubmissions = await GuideShiftSubmission.findAll({
            where: {
                site_id: user.site_id,
                week_start_date,
                guide_id: { [Op.ne]: userId },
                status: { [Op.in]: ['pending', 'approved'] },
                is_active: true
            },
            include: [
                {
                    model: GuideShift,
                    as: 'shifts'
                },
                {
                    model: User,
                    as: 'guide',
                    attributes: ['id', 'full_name', 'email']
                }
            ]
        });

        const overlapErrors = [];
        for (const sub of otherSubmissions) {
            for (const existingShift of (sub.shifts || [])) {
                for (const newShift of validatedShifts) {
                    if (
                        existingShift.day_of_week === newShift.day_of_week &&
                        existingShift.start_time < newShift.end_time &&
                        existingShift.end_time > newShift.start_time
                    ) {
                        overlapErrors.push({
                            day_of_week: newShift.day_of_week,
                            new_shift_time: `${newShift.start_time} - ${newShift.end_time}`,
                            conflicting_guide: sub.guide?.full_name || 'Unknown',
                            conflicting_submission_status: sub.status,
                            existing_time: `${existingShift.start_time} - ${existingShift.end_time}`,
                            error: `Shift overlaps with another Local Guide's ${sub.status} shift`
                        });
                    }
                }
            }
        }

        if (overlapErrors.length > 0) {
            throw new Error(`Shift conflicts detected: ${JSON.stringify(overlapErrors)}`);
        }

        // Generate submission code
        const code = await this.generateShiftSubmissionCode();

        // Create submission
        const submission = await GuideShiftSubmission.create({
            guide_id: userId,
            site_id: user.site_id,
            code,
            week_start_date,
            submission_type: submissionType,
            change_reason: change_reason || null,
            previous_submission_id: previous_submission_id || null,
            status: 'pending',
            total_shifts: validatedShifts.length,
            is_active: true
        });


        const createdShifts = await Promise.all(
            validatedShifts.map(shift => GuideShift.create({
                submission_id: submission.id,
                ...shift
            }))
        );

        return {
            submission,
            shifts: createdShifts,
            errors: errors.length > 0 ? errors : null
        };
    }

    /**
     * Get My Submissions with optional filters
     */
    static async getMySubmissions(userId, filters = {}) {
        const user = await User.findByPk(userId);
        if (!user || !user.site_id) {
            throw new Error('Local Guide not assigned to any site');
        }

        const where = {
            guide_id: userId,
            is_active: true
        };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.week_start_date) {
            where.week_start_date = filters.week_start_date;
        }

        return await GuideShiftSubmission.findAll({
            where,
            include: [{
                model: GuideShift,
                as: 'shifts',
                order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
            }],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get Submission Detail
     */
    static async getSubmissionDetail(userId, submissionId) {
        const submission = await GuideShiftSubmission.findOne({
            where: { id: submissionId, guide_id: userId },
            include: [{
                model: GuideShift,
                as: 'shifts',
                order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
            }]
        });

        if (!submission) {
            throw new Error('Submission not found');
        }

        return submission;
    }

    /**
     * Update Submission (only if pending or rejected)
     */
    static async updateSubmission(userId, submissionId, data) {
        const { shifts } = data;

        const submission = await GuideShiftSubmission.findOne({
            where: {
                id: submissionId,
                guide_id: userId,
                status: { [Op.in]: ['pending', 'rejected'] }
            }
        });

        if (!submission) {
            throw new Error('Submission not found or already approved');
        }


        const wasRejected = submission.status === 'rejected';

        const user = await User.findByPk(userId);
        const site = await Site.findByPk(submission.site_id);


        const normalizeTime = (time) => time.length === 5 ? `${time}:00` : time;
        const validatedShifts = [];

        for (const shift of shifts) {
            const normalizedStart = normalizeTime(shift.start_time);
            const normalizedEnd = normalizeTime(shift.end_time);
            validatedShifts.push({
                day_of_week: shift.day_of_week,
                start_time: normalizedStart,
                end_time: normalizedEnd
            });
        }


        await GuideShift.destroy({ where: { submission_id: submissionId } });


        const createdShifts = await Promise.all(
            validatedShifts.map(shift => GuideShift.create({
                submission_id: submissionId,
                ...shift
            }))
        );


        await submission.update({
            total_shifts: createdShifts.length,
            status: wasRejected ? 'pending' : submission.status,
            rejection_reason: wasRejected ? null : submission.rejection_reason
        });

        return {
            submission,
            shifts: createdShifts
        };
    }

    /**
     * Delete Submission (only if pending)
     */
    static async deleteSubmission(userId, submissionId) {
        const submission = await GuideShiftSubmission.findOne({
            where: { id: submissionId, guide_id: userId, status: 'pending' }
        });

        if (!submission) {
            throw new Error('Submission not found or not pending');
        }


        await GuideShift.destroy({ where: { submission_id: submissionId } });
        await submission.destroy();

        return { message: 'Submission deleted successfully' };
    }

    /**
     * Get Site Schedule - Show all shifts at site for calendar view
     * Local Guide can see all shifts (theirs + others) to know available slots
     */
    static async getSiteSchedule(userId, weekStartDate) {
        const user = await User.findByPk(userId);
        if (!user || !user.site_id) {
            throw new Error('Local Guide not assigned to any site');
        }

        const site = await Site.findByPk(user.site_id);


        const submissions = await GuideShiftSubmission.findAll({
            where: {
                site_id: user.site_id,
                week_start_date: weekStartDate,
                status: { [Op.in]: ['pending', 'approved'] },
                is_active: true
            },
            include: [
                {
                    model: GuideShift,
                    as: 'shifts'
                },
                {
                    model: User,
                    as: 'guide',
                    attributes: ['id', 'full_name']
                }
            ],
            order: [['created_at', 'ASC']]
        });


        const schedule = {};
        for (let day = 0; day <= 6; day++) {
            schedule[day] = [];
        }

        for (const sub of submissions) {
            const isMine = sub.guide_id === userId;
            for (const shift of (sub.shifts || [])) {
                schedule[shift.day_of_week].push({
                    shift_id: shift.id,
                    submission_id: sub.id,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    guide_name: isMine ? 'Me' : (sub.guide?.full_name || 'Unknown'),
                    guide_id: sub.guide_id,
                    status: sub.status,
                    is_mine: isMine
                });
            }
        }


        for (let day = 0; day <= 6; day++) {
            schedule[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        }

        return {
            week_start_date: weekStartDate,
            site_id: user.site_id,
            site_name: site?.name || null,
            opening_hours: site?.opening_hours || null,
            schedule
        };
    }

    // ===================== NEARBY PLACES =====================

    /**
     * Generate nearby place code: NBP[MMDD][SEQ]
     * Example: NBP0122001
     */
    static async generateNearbyPlaceCode() {
        const prefix = 'NBP';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestPlace = await NearbyPlace.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestPlace && latestPlace.code) {
            const lastSeq = parseInt(latestPlace.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Create nearby place
     */
    static async createNearbyPlace(userId, data) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }
            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { name, category, address, latitude, longitude, distance_meters, phone, description } = data;

            const code = await this.generateNearbyPlaceCode();

            const nearbyPlace = await NearbyPlace.create({
                site_id: user.site_id,
                code,
                proposed_by: userId,
                name,
                category,
                address: address || null,
                latitude,
                longitude,
                distance_meters: distance_meters || null,
                phone: phone || null,
                description: description || null,
                status: 'pending'
            });

            Logger.info(`Local Guide ${userId} created nearby place ${nearbyPlace.code}`);

            return nearbyPlace;
        } catch (error) {
            Logger.error('Create nearby place error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY nearby places
     */
    static async getNearbyPlaces(userId, filters = {}) {
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
                proposed_by: userId
            };

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }
            if (filters.category && ['food', 'lodging', 'medical'].includes(filters.category)) {
                where.category = filters.category;
            }

            const { count, rows } = await NearbyPlace.findAndCountAll({
                where,
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
            Logger.error('Get nearby places error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update nearby place (only own + pending/rejected)
     */
    static async updateNearbyPlace(userId, placeId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id,
                    proposed_by: userId
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status === 'approved') {
                throw new Error('Cannot update approved nearby place');
            }

            const { name, category, address, latitude, longitude, distance_meters, phone, description } = updateData;

            const dataToUpdate = {};
            if (name !== undefined) dataToUpdate.name = name;
            if (category !== undefined) dataToUpdate.category = category;
            if (address !== undefined) dataToUpdate.address = address;
            if (latitude !== undefined) dataToUpdate.latitude = latitude;
            if (longitude !== undefined) dataToUpdate.longitude = longitude;
            if (distance_meters !== undefined) dataToUpdate.distance_meters = distance_meters;
            if (phone !== undefined) dataToUpdate.phone = phone;
            if (description !== undefined) dataToUpdate.description = description;

            // Reset to pending if was rejected
            if (place.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
            }

            await place.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated nearby place ${placeId}`);

            return place;
        } catch (error) {
            Logger.error('Update nearby place error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Delete nearby place (only own + pending/rejected)
     */
    static async deleteNearbyPlace(userId, placeId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id,
                    proposed_by: userId
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status === 'approved') {
                throw new Error('Cannot delete approved nearby place');
            }

            await place.destroy();

            Logger.info(`Local Guide ${userId} deleted nearby place ${placeId}`);

            return { message: 'Nearby place deleted successfully' };
        } catch (error) {
            Logger.error('Delete nearby place error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideService;
