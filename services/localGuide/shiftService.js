const { User, Site, GuideShift, GuideShiftSubmission } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../notificationService');

class LocalGuideShiftService {
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

        // Check for overlaps with other guides
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

        // Create shifts
        const createdShifts = await Promise.all(
            validatedShifts.map(shift => GuideShift.create({
                submission_id: submission.id,
                ...shift
            }))
        );

        // Notify Manager
        await NotificationService.notifySiteManager(user.site_id, 'shift_submitted', {
            guideName: user.full_name || user.email,
            weekStart: new Date(week_start_date).toLocaleDateString('vi-VN')
        });

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

        // Delete old shifts
        await GuideShift.destroy({ where: { submission_id: submissionId } });

        // Create new shifts
        const createdShifts = await Promise.all(
            validatedShifts.map(shift => GuideShift.create({
                submission_id: submissionId,
                ...shift
            }))
        );

        // Update submission
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
}

module.exports = LocalGuideShiftService;
