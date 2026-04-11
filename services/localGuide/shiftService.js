const { User, Site, GuideShift, GuideShiftSubmission, Event } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');
const appConfig = require('../../config/app.config');

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
     * Merge overlapping / adjacent time windows into non-overlapping sorted list.
     */
    static mergeTimeWindows(windows) {
        if (windows.length === 0) return [];
        const sorted = [...windows].sort((a, b) => a.open.localeCompare(b.open));
        const merged = [{ ...sorted[0] }];
        for (let i = 1; i < sorted.length; i++) {
            const last = merged[merged.length - 1];
            if (sorted[i].open <= last.close) {
                if (sorted[i].close > last.close) last.close = sorted[i].close;
            } else {
                merged.push({ ...sorted[i] });
            }
        }
        return merged;
    }

    /**
     * Calculate dynamic operating windows for a specific date.
     * Returns an array of non-overlapping time windows (gaps preserved)
     * built from the site's default hours + approved event hours.
     */
    static getDynamicHoursForDate(site, events, targetDateStr) {
        const norm = (t) => (t && t.length === 5) ? `${t}:00` : t;
        const windows = [];
        let hasSchedule = false;

        // ── Build default site window(s) ──
        if (site.opening_hours) {
            if (site.opening_hours.open && site.opening_hours.close) {
                // Unified format: { open: "08:00", close: "17:00" }
                hasSchedule = true;
                const open = norm(site.opening_hours.open);
                const close = norm(site.opening_hours.close);
                if (open <= close) {
                    windows.push({ open, close });
                } else {
                    // Cross-midnight unified hours (e.g. 22:00-04:00)
                    windows.push({ open, close: '23:59:00' });
                    windows.push({ open: '00:00:00', close });
                }
            } else {
                // Weekday-map format: { monday: "08:00-17:00", ... }
                hasSchedule = true;
                const weekdayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayIndex = new Date(`${targetDateStr}T12:00:00`).getDay();
                const dayName = weekdayMap[dayIndex];
                const hoursStr = site.opening_hours[dayName];
                if (hoursStr && typeof hoursStr === 'string') {
                    const parts = hoursStr.split('-');
                    if (parts.length === 2) {
                        const open = norm(parts[0].trim());
                        const close = norm(parts[1].trim());
                        if (open <= close) {
                            windows.push({ open, close });
                        } else {
                            // Cross-midnight: tonight's portion only
                            windows.push({ open, close: '23:59:00' });
                        }
                    }
                }
                // Check yesterday's cross-midnight spill into today
                const yesterdayName = weekdayMap[(dayIndex + 6) % 7];
                const yHoursStr = site.opening_hours[yesterdayName];
                if (yHoursStr && typeof yHoursStr === 'string') {
                    const yParts = yHoursStr.split('-');
                    if (yParts.length === 2) {
                        const yOpen = norm(yParts[0].trim());
                        const yClose = norm(yParts[1].trim());
                        if (yOpen > yClose) {
                            windows.push({ open: '00:00:00', close: yClose });
                        }
                    }
                }
            }
        }

        // ── Add event-based windows ──
        const dayEvents = [];

        for (const ev of events) {
            const evStart = ev.start_time ? ev.start_time.substring(0, 5) : null;
            const evEnd = ev.end_time ? ev.end_time.substring(0, 5) : null;
            const isCrossMidnight = evStart && evEnd && evStart > evEnd;

            let effectiveEndDate = ev.end_date || ev.start_date;
            if (isCrossMidnight && !ev.end_date) {
                const [sy, sm, sd] = ev.start_date.split('-').map(Number);
                const tmp = new Date(Date.UTC(sy, sm - 1, sd + 1));
                effectiveEndDate = tmp.toISOString().split('T')[0];
            }

            if (targetDateStr < ev.start_date || targetDateStr > effectiveEndDate) continue;

            // All-day event
            if (!evStart || !evEnd) {
                windows.push({ open: '00:00:00', close: '23:59:00' });
                dayEvents.push({ name: ev.name, start_time: null, end_time: null, all_day: true });
                continue;
            }

            const normEvStart = norm(evStart);
            const normEvEnd = norm(evEnd);

            if (!isCrossMidnight) {
                // Same-day event: add its own window
                windows.push({ open: normEvStart, close: normEvEnd });
            } else {
                // Cross-midnight event
                // Event starts tonight (on start_date, or any intermediate/last day of multi-day)
                if (targetDateStr === ev.start_date ||
                    (ev.end_date && targetDateStr >= ev.start_date && targetDateStr <= ev.end_date)) {
                    windows.push({ open: normEvStart, close: '23:59:00' });
                }
                // Spillover from previous night (next day after start, up to effectiveEndDate)
                if (targetDateStr > ev.start_date && targetDateStr <= effectiveEndDate) {
                    windows.push({ open: '00:00:00', close: normEvEnd });
                }
            }

            dayEvents.push({ name: ev.name, start_time: evStart, end_time: evEnd });
        }

        // Merge all windows to eliminate overlaps
        const merged = this.mergeTimeWindows(windows);

        return { windows: merged, events: dayEvents, hasSchedule };
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

        // Validate week_start_date and individual shift dates
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: appConfig.timezone }));
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0);

        const weekStart = new Date(week_start_date);
        weekStart.setHours(0, 0, 0, 0);

        // Calculate week end date (6 days after week start - Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Check if entire week is in the past
        if (weekEnd < today) {
            throw new Error('Cannot register shifts for a past week. All days in this week have passed.');
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

        // Fetch approved events overlapping this week for dynamic hours
        const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const weekEndDateStr = fmtDate(weekEnd);
        const dayBeforeWeek = new Date(weekStart.getTime());
        dayBeforeWeek.setDate(dayBeforeWeek.getDate() - 1);
        const dayBeforeWeekStr = fmtDate(dayBeforeWeek);

        const weekEvents = await Event.findAll({
            where: {
                site_id: user.site_id,
                status: 'approved',
                is_active: true,
                [Op.or]: [
                    { start_date: { [Op.lte]: weekEndDateStr }, end_date: { [Op.gte]: week_start_date } },
                    { end_date: null, start_date: { [Op.between]: [dayBeforeWeekStr, weekEndDateStr] } }
                ]
            }
        });

        const validatedShifts = [];
        const errors = [];

        for (let i = 0; i < shifts.length; i++) {
            const { day_of_week, start_time, end_time } = shifts[i];

            try {
                // Validate individual shift date is not in the past
                const weekStartDay = weekStart.getDay();
                const shiftDay = parseInt(day_of_week, 10);
                const offset = (shiftDay - weekStartDay + 7) % 7;

                const shiftDate = new Date(weekStart);
                shiftDate.setDate(shiftDate.getDate() + offset);
                shiftDate.setHours(0, 0, 0, 0);

                if (shiftDate < today) {
                    errors.push({
                        index: i,
                        day_of_week,
                        error: `Cannot register shift for day ${day_of_week} - this date has already passed`
                    });
                    continue;
                }

                const normalizedStart = normalizeTime(start_time);
                const normalizedEnd = normalizeTime(end_time);

                // Validate against dynamic operating windows (site hours + event extensions)
                const shiftDateStr = fmtDate(shiftDate);
                const bounds = LocalGuideShiftService.getDynamicHoursForDate(site, weekEvents, shiftDateStr);
                if (bounds.windows.length > 0) {
                    const fitsInWindow = bounds.windows.some(w =>
                        normalizedStart >= w.open && normalizedEnd <= w.close
                    );
                    if (!fitsInWindow) {
                        const allowed = bounds.windows.map(w => `${w.open.substring(0, 5)}-${w.close.substring(0, 5)}`).join(', ');
                        const label = bounds.events.length > 0 ? ' (includes event hours)' : '';
                        errors.push({ index: i, day_of_week, error: `Shift must fit within operating windows: [${allowed}]${label}` });
                        continue;
                    }
                } else if (bounds.hasSchedule) {
                    errors.push({ index: i, day_of_week, error: 'Site is closed on this day' });
                    continue;
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

        if (errors.length > 0) {
            throw new Error(`Validation errors: ${JSON.stringify(errors)}`);
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

        // Create submission + shifts in a transaction
        const { submission, createdShifts } = await sequelize.transaction(async (t) => {
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
            }, { transaction: t });

            const createdShifts = await Promise.all(
                validatedShifts.map(shift => GuideShift.create({
                    submission_id: submission.id,
                    ...shift
                }, { transaction: t }))
            );

            return { submission, createdShifts };
        });

        // Notify Manager (outside transaction — noti failure should not rollback data)
        try {
            await NotificationService.notifySiteManager(user.site_id, 'shift_submitted', {
                guideName: user.full_name || user.email,
                weekStart: new Date(week_start_date).toLocaleDateString('vi-VN')
            });
        } catch (notifyError) {
            Logger.error('Failed to notify manager about shift submission:', notifyError);
        }

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
            include: [
                {
                    model: GuideShift,
                    as: 'shifts',
                    order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
                },
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['id', 'full_name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get Submission Detail
     */
    static async getSubmissionDetail(userId, submissionId) {
        const submission = await GuideShiftSubmission.findOne({
            where: { id: submissionId, guide_id: userId },
            include: [
                {
                    model: GuideShift,
                    as: 'shifts',
                    order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
                },
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['id', 'full_name', 'email']
                }
            ]
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

        // Validate week_start_date and individual shift dates
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: appConfig.timezone }));
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0);

        const weekStart = new Date(submission.week_start_date);
        weekStart.setHours(0, 0, 0, 0);

        // Calculate week end date
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Check if entire week is in the past
        if (weekEnd < today) {
            throw new Error('Cannot update shifts for a past week. All days in this week have passed.');
        }

        const wasRejected = submission.status === 'rejected';

        const user = await User.findByPk(userId);
        const site = await Site.findByPk(submission.site_id);

        const normalizeTime = (time) => time.length === 5 ? `${time}:00` : time;
        const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Fetch approved events overlapping this week for dynamic hours
        const updateWeekEndStr = fmtDate(weekEnd);
        const updateDayBefore = new Date(weekStart.getTime());
        updateDayBefore.setDate(updateDayBefore.getDate() - 1);
        const updateDayBeforeStr = fmtDate(updateDayBefore);
        const weekEvents = await Event.findAll({
            where: {
                site_id: submission.site_id,
                status: 'approved',
                is_active: true,
                [Op.or]: [
                    { start_date: { [Op.lte]: updateWeekEndStr }, end_date: { [Op.gte]: submission.week_start_date } },
                    { end_date: null, start_date: { [Op.between]: [updateDayBeforeStr, updateWeekEndStr] } }
                ]
            }
        });

        const validatedShifts = [];
        const errors = [];

        for (const shift of shifts) {
            // Validate individual shift date is not in the past
            const weekStartDay = weekStart.getDay();
            const shiftDay = parseInt(shift.day_of_week, 10);
            const offset = (shiftDay - weekStartDay + 7) % 7;

            const shiftDate = new Date(weekStart);
            shiftDate.setDate(shiftDate.getDate() + offset);
            shiftDate.setHours(0, 0, 0, 0);

            if (shiftDate < today) {
                errors.push({
                    day_of_week: shift.day_of_week,
                    error: `Cannot update shift for day ${shift.day_of_week} - this date has already passed`
                });
                continue;
            }

            const normalizedStart = normalizeTime(shift.start_time);
            const normalizedEnd = normalizeTime(shift.end_time);

            // Validate against dynamic operating windows (site hours + event extensions)
            const shiftDateStr = fmtDate(shiftDate);
            const bounds = LocalGuideShiftService.getDynamicHoursForDate(site, weekEvents, shiftDateStr);
            if (bounds.windows.length > 0) {
                const fitsInWindow = bounds.windows.some(w =>
                    normalizedStart >= w.open && normalizedEnd <= w.close
                );
                if (!fitsInWindow) {
                    const allowed = bounds.windows.map(w => `${w.open.substring(0, 5)}-${w.close.substring(0, 5)}`).join(', ');
                    const label = bounds.events.length > 0 ? ' (includes event hours)' : '';
                    errors.push({ day_of_week: shift.day_of_week, error: `Shift must fit within operating windows: [${allowed}]${label}` });
                    continue;
                }
            } else if (bounds.hasSchedule) {
                errors.push({ day_of_week: shift.day_of_week, error: 'Site is closed on this day' });
                continue;
            }

            // Check self-overlap
            const selfOverlap = validatedShifts.some(s =>
                s.day_of_week === shift.day_of_week &&
                s.start_time < normalizedEnd &&
                s.end_time > normalizedStart
            );

            if (selfOverlap) {
                errors.push({ day_of_week: shift.day_of_week, error: 'Shift overlaps with another shift in this request' });
                continue;
            }

            validatedShifts.push({
                day_of_week: shift.day_of_week,
                start_time: normalizedStart,
                end_time: normalizedEnd
            });
        }

        if (validatedShifts.length === 0) {
            throw new Error('No valid shifts to update. All shifts are in the past.');
        }

        if (errors.length > 0) {
            throw new Error(`Validation errors: ${JSON.stringify(errors)}`);
        }

        // Check for overlaps with other guides
        const otherSubmissions = await GuideShiftSubmission.findAll({
            where: {
                site_id: submission.site_id,
                week_start_date: submission.week_start_date,
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

        // Delete old shifts + create new shifts + update submission in a transaction
        const { updatedSubmission, createdShifts } = await sequelize.transaction(async (t) => {
            // Re-check submission status with lock to prevent race with manager approve/reject
            const freshSubmission = await GuideShiftSubmission.findOne({
                where: { id: submissionId },
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            if (!freshSubmission || !['pending', 'rejected'].includes(freshSubmission.status)) {
                throw new Error('Submission not found or already approved');
            }

            const currentWasRejected = freshSubmission.status === 'rejected';

            await GuideShift.destroy({ where: { submission_id: submissionId }, transaction: t });

            const createdShifts = await Promise.all(
                validatedShifts.map(shift => GuideShift.create({
                    submission_id: submissionId,
                    ...shift
                }, { transaction: t }))
            );

            await freshSubmission.update({
                total_shifts: createdShifts.length,
                status: currentWasRejected ? 'pending' : freshSubmission.status,
                rejection_reason: currentWasRejected ? null : freshSubmission.rejection_reason,
                reviewed_by: currentWasRejected ? null : freshSubmission.reviewed_by,
                reviewed_at: currentWasRejected ? null : freshSubmission.reviewed_at
            }, { transaction: t });

            return { updatedSubmission: freshSubmission, createdShifts };
        });

        return {
            submission: updatedSubmission,
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

        // Fetch approved events overlapping this week for dynamic hours
        const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const schedWeekStart = new Date(weekStartDate);
        schedWeekStart.setHours(0, 0, 0, 0);
        const schedWeekEnd = new Date(schedWeekStart);
        schedWeekEnd.setDate(schedWeekEnd.getDate() + 6);
        const schedWeekEndStr = fmtDate(schedWeekEnd);
        const schedDayBefore = new Date(schedWeekStart);
        schedDayBefore.setDate(schedDayBefore.getDate() - 1);
        const schedDayBeforeStr = fmtDate(schedDayBefore);

        const weekEvents = await Event.findAll({
            where: {
                site_id: user.site_id,
                status: 'approved',
                is_active: true,
                [Op.or]: [
                    { start_date: { [Op.lte]: schedWeekEndStr }, end_date: { [Op.gte]: weekStartDate } },
                    { end_date: null, start_date: { [Op.between]: [schedDayBeforeStr, schedWeekEndStr] } }
                ]
            }
        });

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

        // Compute daily_bounds for each day of the week
        const daily_bounds = {};
        for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
            const dayDate = new Date(schedWeekStart.getTime());
            dayDate.setDate(dayDate.getDate() + dayOffset);
            const dayDateStr = fmtDate(dayDate);
            const dayOfWeek = dayDate.getDay();
            daily_bounds[dayOfWeek] = LocalGuideShiftService.getDynamicHoursForDate(site, weekEvents, dayDateStr);
        }

        return {
            week_start_date: weekStartDate,
            site_id: user.site_id,
            site_name: site?.name || null,
            opening_hours: site?.opening_hours || null,
            daily_bounds,
            schedule
        };
    }
}

module.exports = LocalGuideShiftService;
