const { Planner, PlannerItem, User, Site, Event, PlannerInvite, PlannerMember, NearbyPlace } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const sequelize = require('../config/database');
const crypto = require('crypto');
const EmailService = require('./shared/emailService');
const QRCode = require('qrcode');
const { calculateEstimatedTime, parseDurationToMinutes, isWithinOpeningHours } = require('../utils/timeCalculation.util');

const PLANNER_STATUS_LOCK_HOURS = 12;
const PLANNER_DEFAULT_LOCK_DURATION_HOURS = 24;
const PLANNER_EDIT_LOCK_DISCUSSION_HOURS = 12;

class PlannerService {

    static parseTimeValue(timeValue) {
        if (!timeValue || typeof timeValue !== 'string') {
            return null;
        }

        const [hours, minutes] = timeValue.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
            return null;
        }

        return {
            hours,
            minutes,
            totalMinutes: (hours * 60) + minutes,
            formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        };
    }

    static buildDateTime(dateValue, timeValue, fallbackTime) {
        if (!dateValue) {
            return null;
        }

        return new Date(`${dateValue}T${timeValue || fallbackTime}`);
    }

    static normalizeDateOnlyValue(value) {
        if (value === undefined) {
            return undefined;
        }

        if (value === null) {
            return null;
        }

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
        }

        const stringValue = String(value);
        return stringValue.length >= 10 ? stringValue.slice(0, 10) : stringValue;
    }

    static async markPlannerAsOngoing(planner, options = {}) {
        const updateData = {
            status: 'ongoing',
            is_locked: false
        };

        if (!planner.started_at) {
            updateData.started_at = new Date();
        }

        await planner.update(updateData, options);
        planner.status = 'ongoing';
        planner.is_locked = false;

        if (updateData.started_at) {
            planner.started_at = updateData.started_at;
        }

        return planner;
    }

    static normalizePlannerTimeValue(timeValue) {
        if (!timeValue) {
            return '--';
        }

        const rawValue = String(timeValue);
        return rawValue.length >= 5 ? rawValue.slice(0, 5) : rawValue;
    }

    static async getNextUpcomingPlannerItem(plannerId, options = {}) {
        return PlannerItem.findOne({
            where: {
                planner_id: plannerId,
                status: 'upcoming'
            },
            include: [
                { model: Site, as: 'site', attributes: ['id', 'name'] }
            ],
            order: [
                ['leg_number', 'ASC'],
                ['order_index', 'ASC']
            ],
            transaction: options.transaction
        });
    }

    static async notifyOngoingPlannerMembers(planner, type, data = {}, options = {}) {
        if (!planner || planner.status !== 'ongoing') {
            return [];
        }

        const NotificationService = require('./shared/notificationService');
        const joinedMembers = await PlannerMember.findAll({
            where: {
                planner_id: planner.id,
                join_status: 'joined'
            },
            attributes: ['user_id'],
            transaction: options.transaction
        });

        const participantIds = [...new Set([
            planner.user_id,
            ...joinedMembers.map(member => member.user_id)
        ])].filter(userId => userId && userId !== options.excludeUserId);

        if (participantIds.length === 0) {
            return [];
        }

        const notifications = [];
        for (const receiverId of participantIds) {
            try {
                const notification = await NotificationService.createNotification(type, receiverId, data);
                notifications.push(notification);
            } catch (error) {
                Logger.warn(`Failed to notify planner member ${receiverId} for ${type}: ${error.message}`);
            }
        }

        return notifications;
    }

    static validateEventTimingForPlannerItem(planner, legNumber, estimatedTime, event) {
        const itemTime = this.parseTimeValue(estimatedTime);
        if (!event || !itemTime) {
            return { warning: null };
        }

        const eventName = event.name || 'Event';
        const startTime = this.parseTimeValue(event.start_time);
        const endTime = this.parseTimeValue(event.end_time);

        if (planner?.start_date && event.start_date) {
            const itemDateTime = new Date(`${planner.start_date}T00:00:00`);
            itemDateTime.setDate(itemDateTime.getDate() + (legNumber - 1));
            itemDateTime.setHours(itemTime.hours, itemTime.minutes, 0, 0);

            const eventStartDateTime = this.buildDateTime(
                event.start_date,
                startTime ? `${startTime.formatted}:00` : null,
                '00:00:00'
            );

            let eventEndDateTime = this.buildDateTime(
                event.end_date || event.start_date,
                endTime ? `${endTime.formatted}:59` : null,
                '23:59:59'
            );

            if (eventStartDateTime && eventEndDateTime && eventEndDateTime <= eventStartDateTime) {
                eventEndDateTime.setDate(eventEndDateTime.getDate() + 1);
            }

            if (eventEndDateTime && itemDateTime > eventEndDateTime) {
                const error = new Error('Event time after end');
                error.time = itemTime.formatted;
                error.eventName = eventName;
                error.endTime = endTime ? endTime.formatted : '23:59';
                throw error;
            }

            if (eventStartDateTime && itemDateTime >= eventStartDateTime && (!eventEndDateTime || itemDateTime <= eventEndDateTime)) {
                return {
                    warning: {
                        code: 'event_time_window',
                        time: itemTime.formatted,
                        eventName,
                        startTime: startTime ? startTime.formatted : null,
                        endTime: endTime ? endTime.formatted : null
                    }
                };
            }

            return { warning: null };
        }

        if (startTime && endTime) {
            if (endTime.totalMinutes >= startTime.totalMinutes) {
                if (itemTime.totalMinutes > endTime.totalMinutes) {
                    const error = new Error('Event time after end');
                    error.time = itemTime.formatted;
                    error.eventName = eventName;
                    error.endTime = endTime.formatted;
                    throw error;
                }

                if (itemTime.totalMinutes >= startTime.totalMinutes) {
                    return {
                        warning: {
                            code: 'event_time_window',
                            time: itemTime.formatted,
                            eventName,
                            startTime: startTime.formatted,
                            endTime: endTime.formatted
                        }
                    };
                }
            } else {
                const isWithinOvernightWindow =
                    itemTime.totalMinutes >= startTime.totalMinutes ||
                    itemTime.totalMinutes <= endTime.totalMinutes;

                if (isWithinOvernightWindow) {
                    return {
                        warning: {
                            code: 'event_time_window',
                            time: itemTime.formatted,
                            eventName,
                            startTime: startTime.formatted,
                            endTime: endTime.formatted
                        }
                    };
                }
            }
        } else if (startTime && itemTime.totalMinutes >= startTime.totalMinutes) {
            return {
                warning: {
                    code: 'event_time_window',
                    time: itemTime.formatted,
                    eventName,
                    startTime: startTime.formatted,
                    endTime: endTime ? endTime.formatted : null
                }
            };
        } else if (endTime && itemTime.totalMinutes > endTime.totalMinutes) {
            const error = new Error('Event time after end');
            error.time = itemTime.formatted;
            error.eventName = eventName;
            error.endTime = endTime.formatted;
            throw error;
        }

        return { warning: null };
    }

    /**
     * Create a new planner
     */
    static async createPlanner(userId, plannerData) {
        try {
            const { name, number_of_people = 1, transportation, start_date, end_date } = plannerData;

            // Validate required fields
            if (!name || name.trim().length === 0) {
                throw new Error('Name is required');
            }

            // Validate start_date
            if (start_date) {
                const now = new Date();
                const startDateObj = new Date(start_date);
                startDateObj.setHours(0, 0, 0, 0);

                const numPeople = parseInt(number_of_people) || 1;
                
                if (numPeople >= 2) {
                    // Group coordination lead time: 48h (2 days)
                    const minLeadTime = new Date(now);
                    minLeadTime.setHours(minLeadTime.getHours() + 48);
                    
                    if (startDateObj < minLeadTime) {
                        throw new Error('Group lead time error');
                    }
                } else {
                    // Solo trip: must be at least tomorrow
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (startDateObj <= today) {
                        throw new Error('Ngày bắt đầu kế hoạch phải từ ngày mai trở đi');
                    }
                }
            }

            // Validate date range
            if (start_date && end_date) {
                const startDateObj = new Date(start_date);
                const endDateObj = new Date(end_date);
                if (endDateObj < startDateObj) {
                    throw new Error('End date must be after or equal to start date');
                }

                // Validate max 30 days
                const diffTime = endDateObj.getTime() - startDateObj.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
                if (diffDays > 30) {
                    throw new Error('Planner exceeds 30 days');
                }
            }

            // Check overlapping dates with existing planners (both owned and joined)
            if (start_date && end_date) {
                // Get IDs of planners the user has joined
                const memberPlanners = await PlannerMember.findAll({
                    where: {
                        user_id: userId,
                        join_status: 'joined'
                    },
                    attributes: ['planner_id']
                });
                const joinedPlannerIds = memberPlanners.map(m => m.planner_id);

                const overlappingPlanners = await Planner.findAll({
                    where: {
                        is_active: true,
                        [Op.or]: [
                            { user_id: userId },
                            { id: { [Op.in]: joinedPlannerIds } }
                        ],
                        start_date: { [Op.ne]: null },
                        end_date: { [Op.ne]: null },
                        [Op.and]: [
                            { start_date: { [Op.lte]: end_date } },
                            { end_date: { [Op.gte]: start_date } }
                        ]
                    },
                    attributes: ['id', 'name', 'start_date', 'end_date']
                });

                if (overlappingPlanners.length > 0) {
                    // Collect all conflicting dates
                    const conflictDates = new Set();
                    const reqStart = new Date(start_date);
                    const reqEnd = new Date(end_date);

                    for (const p of overlappingPlanners) {
                        const pStart = new Date(p.start_date);
                        const pEnd = new Date(p.end_date);
                        const overlapStart = pStart > reqStart ? pStart : reqStart;
                        const overlapEnd = pEnd < reqEnd ? pEnd : reqEnd;

                        for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
                            conflictDates.add(d.toISOString().split('T')[0]);
                        }
                    }

                    const sortedDates = Array.from(conflictDates).sort();
                    const error = new Error('Planner dates overlap');
                    error.conflictDates = sortedDates;
                    throw error;
                }
            }

            // Validate number_of_people
            if (number_of_people < 1) {
                throw new Error('Number of people must be at least 1');
            }

            // Financial fields — solo planners (number_of_people = 1) cannot have deposit or penalty
            const numPeople = parseInt(plannerData.number_of_people) || 1;
            const depositAmount = numPeople > 1 ? (parseFloat(plannerData.deposit_amount) || 0) : 0;
            const penaltyPercentage = numPeople > 1 ? (parseInt(plannerData.penalty_percentage) || 0) : 0;

            // Wrap in transaction for atomic creation + deposit lock
            const t = await sequelize.transaction();

            try {
                // Create planner
                const planner = await Planner.create({
                    user_id: userId,
                    name: name.trim(),
                    start_date: start_date || null,
                    end_date: end_date || null,
                    number_of_people,
                    transportation: transportation || null,
                    deposit_amount: depositAmount,
                    penalty_percentage: penaltyPercentage,
                    status: 'planning'
                }, { transaction: t });

                // Owner is also tracked in PlannerMember for membership and finance flows
                const memberData = {
                    planner_id: planner.id,
                    user_id: userId,
                    join_status: 'joined',
                    deposit_status: null   // Owner does not pay a deposit
                };

                await PlannerMember.create(memberData, { transaction: t });

                await t.commit();
                Logger.info(`Planner created by user ${userId}: ${planner.id} (deposit: ${depositAmount})`);
                return this.formatPlannerResponse(planner);
            } catch (innerError) {
                await t.rollback();
                throw innerError;
            }
        } catch (error) {
            Logger.error('Create planner error:', error);
            throw error;
        }
    }

    /**
     * Get user's planners with pagination
     * Returns both planners created by the user and planners they are a member of
     */
    static async getUserPlanners(userId, filters = {}) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            // Lấy danh sách ID của các planner mà người dùng là thành viên
            const memberPlanners = await PlannerMember.findAll({
                where: {
                    user_id: userId,
                    join_status: 'joined'
                },
                attributes: ['planner_id']
            });
            const joinedPlannerIds = memberPlanners.map(m => m.planner_id);

            const { rows: planners, count: total } = await Planner.findAndCountAll({
                where: {
                    is_active: true,
                    [Op.or]: [
                        { user_id: userId }, // Planner do user tạo
                        {
                            id: {
                                [Op.in]: joinedPlannerIds
                            }
                        } // Planner mà user tham gia
                    ]
                },
                include: [
                    { model: User, as: 'owner', attributes: ['id', 'full_name', 'email', 'avatar_url'] }
                ],
                limit: parseInt(limit),
                offset,
                order: [
                    ['created_at', 'DESC']
                ]
            });

            await Promise.all(planners.map(planner => this.syncPlannerLockState(planner)));

            return {
                planners: planners.map(p => this.formatPlannerResponse(p)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            Logger.error('Get user planners error:', error);
            throw error;
        }
    }

    /**
     * Get planner by ID with all items grouped by day
     * userId is optional - if not provided, skips ownership check (for token access)
     * Auto-updates status to 'ongoing' if today >= start_date
     */
    static async getPlannerById(plannerId, userId = null) {
        try {
            const planner = await Planner.findByPk(plannerId, {
                include: [
                    { model: User, as: 'owner', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    {
                        model: PlannerItem,
                        as: 'items',
                        include: [
                            { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                        ],
                        order: [
                            ['leg_number', 'ASC'],
                            ['order_index', 'ASC']
                        ]
                    }
                ]
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check access: owner or member (if userId is provided)
            if (userId && planner.user_id !== userId) {
                // Check if user is a member
                const isMember = await PlannerMember.findOne({
                    where: {
                        planner_id: plannerId,
                        user_id: userId,
                        join_status: 'joined'
                    }
                });

                if (!isMember) {
                    throw new Error('Forbidden');
                }
            }

            await this.syncPlannerLockState(planner);

            let plannerState = null;

            // Auto-update status to 'ongoing' based on first task time (Trigger: 2 hours before first task)
            if (['planning', 'locked'].includes(planner.status) && planner.start_date) {
                plannerState = await this.getPlannerState(plannerId, planner);
                const canAutoStart = plannerState.scheduleComplete
                    && plannerState.finalLocked
                    && (planner.number_of_people <= 1 || plannerState.isRealGroup);

                if (canAutoStart) {
                    const shouldBeOngoing = await this.shouldPlannerBeOngoing(planner);
                    if (shouldBeOngoing) {
                        await this.markPlannerAsOngoing(planner);
                        Logger.info(`Planner ${plannerId} auto-updated status from 'planning' to 'ongoing' (triggered by first task time)`);
                    }
                }
            }

            const response = this.formatPlannerWithItems(planner);

            if (plannerState && ['planning', 'locked'].includes(planner.status)) {
                response.first_invite_at = plannerState.firstInviteAt;
                response.edit_lock_available_at = plannerState.editLockAvailableAt;
                response.can_set_edit_lock_at = plannerState.canSetEditLockAt;
            }

            return response;
        } catch (error) {
            Logger.error('Get planner by ID error:', error);
            throw error;
        }
    }

    /**
     * Update planner
     */
    static async updatePlanner(plannerId, userId, updateData) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }
            
            // Block modifications if planner is completed or cancelled
            if (['completed', 'cancelled'].includes(planner.status)) {
                throw new Error(`Cannot update ${planner.status} plan`);
            }

            const plannerState = await this.getPlannerState(plannerId, planner);

            if (['completed', 'cancelled'].includes(planner.status)) {
                throw new Error(`Cannot update ${planner.status} plan`);
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            // Prepare update data
            const dataToUpdate = {};

            if (updateData.name !== undefined) {
                dataToUpdate.name = updateData.name.trim();
            }

            // Cập nhật start_date và end_date
            const requestedStartDate = this.normalizeDateOnlyValue(updateData.start_date);
            const requestedEndDate = this.normalizeDateOnlyValue(updateData.end_date);
            const currentStartDate = this.normalizeDateOnlyValue(planner.start_date);
            const currentEndDate = this.normalizeDateOnlyValue(planner.end_date);

            if (
                (requestedStartDate !== undefined && requestedStartDate !== currentStartDate) ||
                (requestedEndDate !== undefined && requestedEndDate !== currentEndDate)
            ) {
                throw new Error('Planner dates can only be set during creation');
            }

            if (updateData.edit_lock_at !== undefined) {
                if (updateData.edit_lock_at === null) {
                    dataToUpdate.edit_lock_at = null;
                    dataToUpdate.is_locked = false;
                } else {
                    const requestNow = new Date();
                    const requestedNumPeople = updateData.number_of_people ?? planner.number_of_people ?? 1;
                    if (requestedNumPeople < 2) {
                        throw new Error('Only group journeys can schedule an edit lock');
                    }

                    const plannerLockReference = {
                        ...planner.get({ plain: true }),
                        ...dataToUpdate,
                        number_of_people: requestedNumPeople
                    };

                    if (!plannerLockReference.start_date || !plannerLockReference.end_date) {
                        throw new Error('Edit lock requires complete schedule');
                    }

                    const requestedScheduleState = await this.getPlannerScheduleState(plannerId, plannerLockReference);
                    if (!requestedScheduleState.isValid) {
                        throw new Error('Edit lock requires complete schedule');
                    }

                    const requestedEditLockAt = new Date(updateData.edit_lock_at);
                    if (Number.isNaN(requestedEditLockAt.getTime())) {
                        throw new Error('Invalid edit lock time');
                    }

                    const firstInviteAt = await this.getPlannerFirstInviteAt(plannerId);
                    if (!firstInviteAt) {
                        throw new Error('Edit lock requires first invite');
                    }

                    const editLockAvailableAt = this.getPlannerEditLockAvailableAt(firstInviteAt);
                    if (!editLockAvailableAt || requestNow < editLockAvailableAt) {
                        const error = new Error('Edit lock requires discussion period');
                        error.editLockAvailableAt = editLockAvailableAt;
                        throw error;
                    }

                    if (requestedEditLockAt < editLockAvailableAt) {
                        const error = new Error('Edit lock must be after discussion period');
                        error.editLockAvailableAt = editLockAvailableAt;
                        throw error;
                    }

                    const plannerLockAt = this.getPlannerStatusLockAt(plannerLockReference);
                    if (plannerLockAt && requestedEditLockAt > plannerLockAt) {
                        throw new Error('Edit lock must be on or before planner lock time');
                    }

                    dataToUpdate.edit_lock_at = requestedEditLockAt;
                    dataToUpdate.is_locked = requestedEditLockAt <= requestNow;
                }
            }

            // Validate start date must be >= tomorrow (chỉ check khi có sửa đổi start_date)
            if (updateData.start_date !== undefined && updateData.start_date !== planner.start_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const startDateObj = new Date(updateData.start_date);
                if (startDateObj <= today) {
                    throw new Error('Ngày bắt đầu kế hoạch phải từ ngày mai trở đi');
                }
            }

            // Validate date range nếu update cả hai
            const newStart = dataToUpdate.start_date ?? planner.start_date;
            const newEnd = dataToUpdate.end_date ?? planner.end_date;
            if (newStart && newEnd) {
                const startObj = new Date(newStart);
                const endObj = new Date(newEnd);
                if (endObj < startObj) {
                    throw new Error('End date must be after or equal to start date');
                }
                const diffDays = Math.ceil((endObj - startObj) / (1000 * 60 * 60 * 24)) + 1;
                if (diffDays > 30) {
                    throw new Error('Planner exceeds 30 days');
                }
            }

            if (updateData.number_of_people !== undefined) {
                if (updateData.number_of_people < 1) {
                    throw new Error('Number of people must be at least 1');
                }
                if (updateData.number_of_people < plannerState.committedSlots) {
                    const error = new Error('Cannot reduce capacity below committed slots');
                    error.requiredSlots = plannerState.committedSlots;
                    throw error;
                }
                dataToUpdate.number_of_people = updateData.number_of_people;
            }

            if (updateData.transportation !== undefined) {
                dataToUpdate.transportation = updateData.transportation;
            }

            if (updateData.status !== undefined) {
                dataToUpdate.status = updateData.status;
            }

            // Update deposit/penalty — only allowed when planner has > 1 person
            // Use current DB value if request does not include number_of_people
            const effectiveNumPeople = dataToUpdate.number_of_people ?? planner.number_of_people ?? 1;

            if (updateData.deposit_amount !== undefined) {
                if (effectiveNumPeople <= 1 && parseFloat(updateData.deposit_amount) > 0) {
                    throw new Error('Solo planner cannot have a deposit amount');
                }
                dataToUpdate.deposit_amount = parseFloat(updateData.deposit_amount) || 0;
            }

            if (updateData.penalty_percentage !== undefined) {
                if (effectiveNumPeople <= 1 && parseInt(updateData.penalty_percentage) > 0) {
                    throw new Error('Solo planner cannot have a penalty percentage');
                }
                dataToUpdate.penalty_percentage = parseInt(updateData.penalty_percentage) || 0;
            }

            // Edge case: downgrade to solo → clear existing deposit/penalty automatically
            if (effectiveNumPeople <= 1) {
                dataToUpdate.deposit_amount = 0;
                dataToUpdate.penalty_percentage = 0;
                dataToUpdate.edit_lock_at = null;
                dataToUpdate.is_locked = false;
            }

            const nextPlannerSnapshot = {
                ...planner.get({ plain: true }),
                ...dataToUpdate
            };

            if (effectiveNumPeople > 1 && nextPlannerSnapshot.edit_lock_at) {
                const nextPlannerLockAt = this.getPlannerStatusLockAt(nextPlannerSnapshot);
                if (nextPlannerLockAt && new Date(nextPlannerSnapshot.edit_lock_at) > nextPlannerLockAt) {
                    throw new Error('Edit lock must be on or before planner lock time');
                }
            }

            if (plannerState.hasSharedCommitment) {
                if (!nextPlannerSnapshot.start_date || !nextPlannerSnapshot.end_date) {
                    throw new Error('Cannot make planner incomplete after sharing');
                }
                const nextScheduleState = await this.getPlannerScheduleState(plannerId, nextPlannerSnapshot);
                if (!nextScheduleState.isValid) {
                    const error = new Error('Cannot make planner incomplete after sharing');
                    error.missingDays = nextScheduleState.missingDays;
                    error.extraDays = nextScheduleState.extraDays;
                    error.totalDays = nextScheduleState.totalDays;
                    throw error;
                }
            }

            // Update planner
            await planner.update(dataToUpdate);

            Logger.info(`Planner updated by user ${userId}: ${plannerId}`);
            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Update planner error:', error);
            throw error;
        }
    }

    /**
     * Delete planner (soft delete - set is_active to false)
     */
    static async deletePlanner(plannerId, userId) {
        const sequelize = require('../config/database');
        const t = await sequelize.transaction();
        try {
            const planner = await Planner.findByPk(plannerId, { transaction: t });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Only allow deletion during planning phase
            if (['ongoing', 'completed', 'cancelled'].includes(planner.status)) {
                if (planner.status === 'ongoing') {
                    throw new Error('Cannot delete ongoing journey');
                } else if (planner.status === 'completed') {
                    throw new Error('Cannot delete completed plan');
                } else {
                    throw new Error('Cannot delete cancelled plan');
                }
            }

            const plannerState = await this.getPlannerState(plannerId, planner, { transaction: t });

            if (planner.status === 'cancelled') {
                throw new Error('Cannot delete cancelled plan');
            }

            if (this.isGroupPlanner(planner) && plannerState.firstInviteAt) {
                throw new Error('Cannot delete shared group planner');
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            const depositAmount = parseFloat(planner.deposit_amount) || 0;
            const refundResults = [];

            // Refund all joined members who paid deposit
            if (depositAmount > 0) {
                const { PlannerMember, Transaction, Wallet } = require('../models');
                const WalletService = require('./pilgrim/walletService');

                const paidMembers = await PlannerMember.findAll({
                    where: {
                        planner_id: plannerId,
                        deposit_status: 'paid',
                        join_status: 'joined',
                        user_id: { [Op.ne]: planner.user_id } // exclude owner
                    },
                    transaction: t
                });

                // Fail-fast: if any refund fails, rollback entire deletion
                for (const member of paidMembers) {
                    await WalletService.refundOnKick(
                        member.user_id, depositAmount, plannerId, planner.name, t
                    );
                    member.deposit_status = 'refunded';
                    member.join_status = 'kicked';
                    await member.save({ transaction: t });
                    refundResults.push({ user_id: member.user_id, refunded: true });
                }

                // Cancel any pending deposit transactions (awaiting payment)
                const { PlannerInvite } = require('../models');
                const PayOSService = require('./shared/payosService');

                const pendingTxs = await Transaction.findAll({
                    where: {
                        reference_type: 'planner_deposit',
                        reference_id: { [Op.like]: `${plannerId}:%` },
                        type: 'escrow_lock',
                        status: 'pending'
                    },
                    transaction: t
                });

                for (const tx of pendingTxs) {
                    try {
                        const orderCode = tx.reference_id.split(':')[2];
                        if (orderCode !== 'wallet') {
                            await PayOSService.cancelPaymentLink(orderCode);
                        }
                    } catch (e) {
                        Logger.warn(`Could not cancel PayOS order on planner delete: ${e.message}`);
                    }
                    await tx.update({ status: 'cancelled' }, { transaction: t });
                }

                // Cancel pending/awaiting_payment invites
                await PlannerInvite.update(
                    { status: 'expired' },
                    {
                        where: {
                            planner_id: plannerId,
                            status: { [Op.in]: ['pending', 'awaiting_payment'] }
                        },
                        transaction: t
                    }
                );
            }

            // Kick any remaining joined members (including those without deposit)
            const allJoinedMembers = await PlannerMember.findAll({
                where: {
                    planner_id: plannerId,
                    join_status: 'joined',
                    user_id: { [Op.ne]: planner.user_id }
                },
                transaction: t
            });
            const allKickedUserIds = refundResults.map(r => r.user_id);
            for (const member of allJoinedMembers) {
                member.join_status = 'kicked';
                await member.save({ transaction: t });
                if (!allKickedUserIds.includes(member.user_id)) {
                    allKickedUserIds.push(member.user_id);
                }
            }

            // Soft delete
            await planner.update({ is_active: false }, { transaction: t });

            await t.commit();

            Logger.info(`Planner soft deleted by user ${userId}: ${plannerId}, refunded ${refundResults.length} members, kicked ${allKickedUserIds.length} total`);

            // Send notifications (fire-and-forget)
            const NotificationService = require('./shared/notificationService');
            for (const memberId of allKickedUserIds) {
                NotificationService.createNotification('planner_kicked', memberId, {
                    plannerName: planner.name
                }).catch(e => Logger.warn(`Failed to send kicked notification: ${e.message}`));

                const wasRefunded = refundResults.find(r => r.user_id === memberId);
                if (wasRefunded) {
                    NotificationService.createNotification('planner_deposit_refunded', memberId, {
                        plannerName: planner.name,
                        amount: depositAmount.toLocaleString('vi-VN')
                    }).catch(e => Logger.warn(`Failed to send refund notification: ${e.message}`));
                }
            }

            return {
                id: plannerId,
                message: `Đã xóa kế hoạch "${planner.name}"`,
                members_refunded: refundResults.length,
                members_kicked: allKickedUserIds.length,
                refund_amount_each: depositAmount > 0 ? depositAmount : undefined
            };
        } catch (error) {
            await t.rollback();
            Logger.error('Delete planner error:', error);
            throw error;
        }
    }

    /**
     * Share a completed planner journey to community posts
     */
    static async sharePlannerToPost(userId, plannerId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                const error = new Error('You can only share your own planners');
                error.statusCode = 403;
                throw error;
            }

            // Check if completed
            if (planner.status !== 'completed') {
                const error = new Error('You can only share a completed journey');
                error.statusCode = 400;
                throw error;
            }

            // Check if already shared
            const { Post } = require('../models');
            const existingPost = await Post.findOne({
                where: {
                    user_id: userId,
                    planner_id: plannerId
                }
            });

            if (existingPost) {
                const error = new Error('This journey has already been shared to the community');
                error.statusCode = 400;
                throw error;
            }

            // Create post referencing the planner
            const post = await Post.create({
                user_id: userId,
                planner_id: plannerId,
                content: `Hành trình "${planner.name}" của tôi đã hoàn thành!`,
                status: 'published'
            });

            Logger.info(`Planner ${plannerId} shared to post ${post.id} by user ${userId}`);
            return post;
        } catch (error) {
            Logger.error('Share planner to post error:', error);
            throw error;
        }
    }

    /**
     * Add item to planner with distance validation
     * userId is optional - if not provided, skips ownership check (for token access)
     * 
     * If event_id is provided:
     * - Auto-calculate leg_number from event.start_date vs planner.start_date
     * - Auto-calculate estimated_time from event.start_time
     * - Auto-calculate rest_duration from event.start_time to event.end_time
     * - If event spans multiple days, create items for each day
     */
    static async addPlannerItem(plannerId, userId = null, itemData) {
        const transaction = await sequelize.transaction();

        try {
            let { site_id, leg_number, note, nearby_amenity_ids, estimated_time, rest_duration, travel_time_minutes, event_id } = itemData;

            // ========== EVENT HANDLING ==========
            let eventInfo = null;
            let multiDayItems = null; // For multi-day events
            let eventTimeWarning = null;

            if (event_id) {
                const event = await Event.findByPk(event_id);

                if (!event) {
                    throw new Error('Event not found');
                }

                if (event.status !== 'approved' || !event.is_active) {
                    throw new Error('Event is not available');
                }

                eventInfo = event;

                // Get planner to calculate leg_number
                const planner = await Planner.findByPk(plannerId);
                if (!planner) {
                    throw new Error('Planner not found');
                }

                // Use event's site_id if not provided
                if (!site_id) {
                    site_id = event.site_id;
                }

                // Calculate leg_number: use planner dates if available, otherwise use next available day
                let calculatedLegNumber;

                if (planner.start_date && planner.end_date) {
                    // Calculate from planner dates (existing logic)
                    const plannerStartDate = new Date(planner.start_date);
                    const eventStartDate = new Date(event.start_date);
                    const eventEndDate = event.end_date ? new Date(event.end_date) : eventStartDate;

                    plannerStartDate.setHours(0, 0, 0, 0);
                    eventStartDate.setHours(0, 0, 0, 0);
                    eventEndDate.setHours(0, 0, 0, 0);

                    const plannerEndDate = new Date(planner.end_date);
                    plannerEndDate.setHours(0, 0, 0, 0);

                    // Validate event dates are within planner range
                    if (eventStartDate < plannerStartDate || eventStartDate > plannerEndDate) {
                        throw new Error(`Sự kiện "${event.name}" bắt đầu ngày ${event.start_date} không nằm trong lịch trình (${planner.start_date} - ${planner.end_date}).`);
                    }

                    // Calculate leg_number (1-based)
                    calculatedLegNumber = Math.ceil((eventStartDate - plannerStartDate) / (1000 * 60 * 60 * 24)) + 1;
                } else {
                    // Không có ngày: dùng leg_number tiếp theo trong planner
                    const existingItems = await PlannerItem.findAll({
                        where: { planner_id: plannerId },
                        attributes: ['leg_number'],
                        order: [
                            ['leg_number', 'DESC']
                        ],
                        limit: 1
                    });

                    calculatedLegNumber = existingItems.length > 0 ? existingItems[0].leg_number + 1 : 1;

                    Logger.info(`Planner without dates: using calculated leg_number = ${calculatedLegNumber} for event ${event.name}`);
                }

                // Override leg_number with calculated value
                leg_number = calculatedLegNumber;
                Logger.info(`Event ${event.name}: auto-calculated leg_number = ${leg_number}`);

                // Calculate estimated_time from event.start_time
                if (event.start_time && !estimated_time) {
                    estimated_time = event.start_time.substring(0, 5); // "HH:mm"
                    Logger.info(`Event ${event.name}: auto-calculated estimated_time = ${estimated_time}`);
                }

                // Calculate rest_duration from start_time to end_time
                if (event.start_time && event.end_time && !rest_duration) {
                    const [startHours, startMins] = event.start_time.split(':').map(Number);
                    const [endHours, endMins] = event.end_time.split(':').map(Number);

                    let eventStartMinutes = startHours * 60 + startMins;
                    let eventEndMinutes = endHours * 60 + endMins;

                    // Handle overnight events (e.g., 23:00 - 01:00)
                    if (eventEndMinutes <= eventStartMinutes) {
                        eventEndMinutes += 1440; // Add 24 hours
                    }

                    const durationMinutes = eventEndMinutes - eventStartMinutes;
                    const hours = Math.floor(durationMinutes / 60);
                    const mins = durationMinutes % 60;

                    if (hours > 0 && mins > 0) {
                        rest_duration = `${hours}h${mins}m`;
                    } else if (hours > 0) {
                        rest_duration = `${hours}h`;
                    } else {
                        rest_duration = `${mins}m`;
                    }

                    Logger.info(`Event ${event.name}: auto-calculated rest_duration = ${rest_duration}`);
                }

                // Check if event spans multiple days
                const eventDays = Math.ceil((eventEndDate - eventStartDate) / (1000 * 60 * 60 * 24)) + 1;

                if (eventDays > 1) {
                    // Validate all event days are within planner range
                    if (eventEndDate > plannerEndDate) {
                        throw new Error(`Sự kiện "${event.name}" kết thúc ngày ${event.end_date} vượt quá lịch trình (kết thúc ${planner.end_date}).`);
                    }

                    // Prepare multi-day items
                    multiDayItems = [];
                    for (let i = 0; i < eventDays; i++) {
                        multiDayItems.push({
                            leg_number: calculatedLegNumber + i,
                            note: `${note || event.name} (Ngày ${i + 1}/${eventDays})`,
                            estimated_time: estimated_time,
                            rest_duration: rest_duration
                        });
                    }

                    Logger.info(`Event ${event.name}: multi-day event (${eventDays} days), creating ${multiDayItems.length} items`);
                }

                // Set default note if not provided
                if (!note) {
                    note = `Sự kiện: ${event.name}`;
                }
            }

            // Validate required fields
            if (!rest_duration) {
                throw new Error('Rest duration is required');
            }

            // Remove duplicate nearby_amenity_ids and validate existence
            let validatedNearbyAmenityIds = [];
            if (nearby_amenity_ids && nearby_amenity_ids.length > 0) {
                // Remove duplicates
                const uniqueIds = [...new Set(nearby_amenity_ids)];

                // Check if all NearbyPlace IDs exist and are approved/active
                const existingPlaces = await NearbyPlace.findAll({
                    where: {
                        id: {
                            [Op.in]: uniqueIds
                        },
                        status: 'approved',
                        is_active: true
                    },
                    attributes: ['id']
                });

                const existingIds = existingPlaces.map(p => p.id);
                const invalidIds = uniqueIds.filter(id => !existingIds.includes(id));

                if (invalidIds.length > 0) {
                    Logger.warn(`Invalid nearby_amenity_ids: ${invalidIds.join(', ')}`);
                }

                validatedNearbyAmenityIds = existingIds;
            }

            // Check planner exists and user is owner (if userId provided)
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            // Block modifications if planner is completed or cancelled
            if (['completed', 'cancelled'].includes(planner.status)) {
                throw new Error(`Cannot add item to ${planner.status} plan`);
            }

            const plannerState = await this.getPlannerState(plannerId, planner, { transaction });

            if (planner.status === 'cancelled') {
                throw new Error('Cannot add item to cancelled plan');
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            if (userId && planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Check site exists
            const site = await Site.findByPk(site_id);
            if (!site) {
                throw new Error('Site not found');
            }

            // Validate leg_number (if planner has date range)
            if (planner.start_date && planner.end_date) {
                const startDate = new Date(planner.start_date);
                const endDate = new Date(planner.end_date);
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                if (leg_number < 1 || leg_number > totalDays) {
                    throw new Error(`Invalid day number. Must be between 1 and ${totalDays}`);
                }
            } else if (leg_number < 1) {
                throw new Error('Day number must be at least 1');
            }

            // ===== VALIDATION: Không được bỏ trống ngày trước đó =====
            if (leg_number > 1 && !multiDayItems) {
                // Lấy tất cả các ngày đã có items
                const existingDays = await PlannerItem.findAll({
                    where: { planner_id: plannerId },
                    attributes: [
                        [sequelize.fn('DISTINCT', sequelize.col('leg_number')), 'leg_number']
                    ],
                    raw: true
                });

                const legNumbersSet = new Set(existingDays.map(d => d.leg_number));

                // Kiểm tra các ngày từ 1 đến leg_number-1
                const missingDays = [];
                for (let i = 1; i < leg_number; i++) {
                    if (!legNumbersSet.has(i)) {
                        missingDays.push(i);
                    }
                }

                if (missingDays.length > 0) {
                    throw new Error(`Missing preceding days: current day ${leg_number}, missing days ${missingDays.join(', ')}`);
                }
            }
            // ===== END: Validation =====

            let travelTimeMinutes = 0;

            // Get previous site in same day (if exists)
            const previousItem = await PlannerItem.findOne({
                where: {
                    planner_id: plannerId,
                    leg_number: leg_number
                },
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'latitude', 'longitude'] }
                ],
                order: [
                    ['order_index', 'DESC']
                ],
                transaction
            });

            // Validation: Cannot add the same site consecutively
            if (previousItem && previousItem.site_id === site_id) {
                throw new Error('Consecutive site not allowed');
            }

            // ===== VALIDATION: Check travel time between days =====
            // When adding to a new day, validate that arrival time from previous day is reasonable
            if (leg_number > 1 && travel_time_minutes && travel_time_minutes > 0) {
                // Get last item of previous day
                const lastItemPreviousDay = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: leg_number - 1
                    },
                    include: [
                        { model: Site, as: 'site', attributes: ['id', 'name', 'latitude', 'longitude'] }
                    ],
                    order: [
                        ['order_index', 'DESC']
                    ],
                    transaction
                });

                if (lastItemPreviousDay && lastItemPreviousDay.estimated_time) {
                    // Calculate arrival time to first item of new day
                    // arrival = last_item.estimated_time + rest_duration + travel_time_minutes
                    const [lastHours, lastMins] = lastItemPreviousDay.estimated_time.split(':').map(Number);
                    const lastRestMinutes = parseDurationToMinutes(lastItemPreviousDay.rest_duration) || 0;

                    // Calculate arrival minutes to new day (relative to 00:00 of new day)
                    // If last item is at 23:00, rest 30min, travel 3h = 02:30 next day = 150 minutes after midnight
                    const departureMinutes = lastHours * 60 + lastMins + lastRestMinutes; // minutes from midnight of previous day
                    const arrivalMinutes = departureMinutes + travel_time_minutes; // minutes from midnight of previous day
                    const arrivalMinutesInNewDay = arrivalMinutes - 1440; // minutes from midnight of new day (can be negative if before midnight)

                    // Get user-provided estimated_time for first item of new day
                    let newItemEstimatedMinutes = null;
                    if (estimated_time) {
                        const [newHours, newMins] = estimated_time.split(':').map(Number);
                        newItemEstimatedMinutes = newHours * 60 + newMins;
                    } else {
                        // Default to 09:00 if not provided
                        newItemEstimatedMinutes = 9 * 60; // 540 minutes = 09:00
                    }

                    // Check if new item time is before arrival time from previous day
                    // arrivalMinutesInNewDay can be negative if travel doesn't cross midnight
                    // e.g., 23:00 + 30min rest + 1h travel = 00:30 next day = 30 minutes in new day (positive)
                    // e.g., 20:00 + 30min rest + 1h travel = 21:30 same day (negative, = -30)

                    // If travel crosses midnight, arrivalMinutesInNewDay > 0
                    // If new item time < arrival time, it's impossible
                    if (arrivalMinutes > 1440 && newItemEstimatedMinutes < arrivalMinutesInNewDay) {
                        const travelHours = Math.floor(travel_time_minutes / 60);
                        const travelMinsPart = travel_time_minutes % 60;
                        
                        throw new Error(`Invalid arrival time suggested: ${estimated_time}, departure ${lastItemPreviousDay.estimated_time}, travel ${travelHours}h ${travelMinsPart}m, suggested ${arrivalTimeStr}`);
                    }

                    Logger.info(`Travel validation: arrivalMinutes=${arrivalMinutes}, arrivalMinutesInNewDay=${arrivalMinutesInNewDay}, newItemTime=${newItemEstimatedMinutes}`);
                }
            }
            // ===== END: Validation =====

            // Validation: Check if travel time causes arrival to next day
            if (previousItem && previousItem.estimated_time && travel_time_minutes && travel_time_minutes > 0) {
                const [prevHours, prevMins] = previousItem.estimated_time.split(':').map(Number);
                const prevRestMinutes = parseDurationToMinutes(previousItem.rest_duration) || 0;

                // Calculate arrival time = previous estimated_time + previous rest_duration + travel_time
                const arrivalMinutes = prevHours * 60 + prevMins + prevRestMinutes + travel_time_minutes;

                // If arrival time >= 24:00 (1440 minutes), it's next day
                if (arrivalMinutes >= 1440) {
                    const travelHours = Math.floor(travel_time_minutes / 60);
                    const travelMinsPart = travel_time_minutes % 60;
                    throw new Error(`Arrival time past midnight: departure ${previousItem.estimated_time}, travel ${travelHours}h ${travelMinsPart}m, day ${leg_number}`);
                }
            }

            // Note: Travel time calculation is handled by mobile app

            // Auto-calculate estimated_time based on previous item
            // Map frontend provide final estimated time if valid 
            let finalEstimatedTime;
            const validTimeRegex = /^([01]\d|2[0-3]):?([0-5]\d)$/;

            if (estimated_time && validTimeRegex.test(estimated_time)) {
                finalEstimatedTime = estimated_time.replace(':', '');
                finalEstimatedTime = `${finalEstimatedTime.substring(0, 2)}:${finalEstimatedTime.substring(2, 4)}`;
                Logger.info(`Using user-provided estimated_time: ${finalEstimatedTime}`);

                // Validation: Check if estimated_time is after previous item's departure time + travel time
                if (previousItem && previousItem.estimated_time) {
                    const [prevHours, prevMins] = previousItem.estimated_time.split(':').map(Number);
                    const prevRestMinutes = parseDurationToMinutes(previousItem.rest_duration) || 0;
                    const prevDepartureMinutes = prevHours * 60 + prevMins + prevRestMinutes;

                    // Calculate minimum arrival time (departure + travel)
                    const travelMins = travel_time_minutes || 0;
                    const minimumArrivalMinutes = prevDepartureMinutes + travelMins;

                    const [newHours, newMins] = finalEstimatedTime.split(':').map(Number);
                    const newArrivalMinutes = newHours * 60 + newMins;

                    // Format departure time
                    const departureHours = Math.floor(prevDepartureMinutes / 60);
                    const departureMins = prevDepartureMinutes % 60;
                    const departureTimeStr = `${String(departureHours).padStart(2, '0')}:${String(departureMins).padStart(2, '0')}`;

                    // Check if arrival time >= departure time
                    if (newArrivalMinutes < prevDepartureMinutes) {
                        throw new Error(`Invalid arrival time: ${finalEstimatedTime}, departure: ${departureTimeStr}`);
                    }

                    // Check if arrival time >= departure + travel (with 5 min tolerance)
                    if (travelMins > 0 && newArrivalMinutes < minimumArrivalMinutes - 5) {
                        const suggestedArrivalHours = Math.floor(minimumArrivalMinutes / 60) % 24;
                        const suggestedArrivalMins = minimumArrivalMinutes % 60;
                        const suggestedTimeStr = `${String(suggestedArrivalHours).padStart(2, '0')}:${String(suggestedArrivalMins).padStart(2, '0')}`;

                        const travelHours = Math.floor(travelMins / 60);
                        const travelMinsPart = travelMins % 60;
                        const travelStr = travelHours > 0 ? `${travelHours}h ${travelMinsPart}m` : `${travelMinsPart}m`;

                        // If minimum arrival crosses midnight, block it
                        if (minimumArrivalMinutes >= 1440) {
                            throw new Error(`Arrival time past midnight: departure ${departureTimeStr}, travel ${travelStr}, day ${leg_number}`);
                        }

                        throw new Error(`Invalid arrival time suggested: ${finalEstimatedTime}, departure ${departureTimeStr}, travel ${travelStr}, suggested ${suggestedTimeStr}`);
                    }
                }

                // Validation: Check for duplicate estimated_time in the same day
                const existingItemWithSameTime = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: leg_number,
                        estimated_time: finalEstimatedTime
                    },
                    transaction
                });

                if (existingItemWithSameTime) {
                    throw new Error(`Duplicate time in day: ${finalEstimatedTime}, day ${leg_number}`);
                }
            } else if (previousItem && previousItem.estimated_time) {
                // If there's a previous item but no user input, auto-calculate with 0 travel time
                finalEstimatedTime = calculateEstimatedTime(previousItem, travelTimeMinutes, '09:00');
                Logger.info(`Auto-calculated estimated_time: ${finalEstimatedTime} (from ${previousItem.estimated_time} + ${parseDurationToMinutes(previousItem.rest_duration)}min rest + ${travelTimeMinutes}min travel)`);
            } else {
                // First item in the day and NO user input
                finalEstimatedTime = '09:00';
            }

            if (previousItem && previousItem.estimated_time) {
                // Validation 2: Total time in a day should not exceed 24 hours
                // Get the first item of the day to calculate total duration
                const firstItem = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: leg_number
                    },
                    order: [
                        ['order_index', 'ASC']
                    ],
                    transaction
                });

                if (firstItem && firstItem.estimated_time) {
                    // Calculate time difference from first item to current item
                    const [firstHours, firstMins] = firstItem.estimated_time.split(':').map(Number);
                    const [currentHours, currentMins] = finalEstimatedTime.split(':').map(Number);

                    const firstTotalMinutes = firstHours * 60 + firstMins;
                    const currentTotalMinutes = currentHours * 60 + currentMins;

                    let totalDayMinutes = currentTotalMinutes - firstTotalMinutes;

                    // Handle case where time wraps to next day (e.g., 23:00 to 01:00)
                    if (totalDayMinutes < 0) {
                        totalDayMinutes += 1440; // Add 24 hours
                    }

                    if (totalDayMinutes > 1440) { // 1440 minutes = 24 hours
                        throw new Error(`Total time for day ${leg_number} exceeds 24 hours (${Math.floor(totalDayMinutes / 60)} hours). Please split into multiple days.`);
                    }
                }
            }

            // Validation 3: Check if estimated_time falls within site's opening hours (skip for events)
            if (!event_id && site.opening_hours && planner.start_date) {
                // Calculate the actual date for this leg_number
                const startDate = new Date(planner.start_date);
                const actualDate = new Date(startDate);
                actualDate.setDate(startDate.getDate() + (leg_number - 1));

                const openingCheck = isWithinOpeningHours(finalEstimatedTime, site.opening_hours, actualDate);
                if (!openingCheck.isOpen) {
                    Logger.warn(`Opening hours validation failed: ${openingCheck.message}`);
                    throw new Error(openingCheck.message);
                }
            }

            if (eventInfo && (!multiDayItems || multiDayItems.length <= 1)) {
                const timingValidation = this.validateEventTimingForPlannerItem(
                    planner,
                    leg_number,
                    finalEstimatedTime,
                    eventInfo
                );
                eventTimeWarning = timingValidation.warning;
            }

            // ========== HANDLE MULTI-DAY EVENTS ==========
            if (multiDayItems && multiDayItems.length > 1) {
                const createdItems = [];

                for (let i = 0; i < multiDayItems.length; i++) {
                    const dayItem = multiDayItems[i];
                    const itemLegNumber = dayItem.leg_number;
                    const itemEstimatedTime = dayItem.estimated_time || finalEstimatedTime;

                    if (eventInfo) {
                        const timingValidation = this.validateEventTimingForPlannerItem(
                            planner,
                            itemLegNumber,
                            itemEstimatedTime,
                            eventInfo
                        );

                        if (!eventTimeWarning && timingValidation.warning) {
                            eventTimeWarning = timingValidation.warning;
                        }
                    }

                    // Get previous item in this day
                    const prevItemInDay = await PlannerItem.findOne({
                        where: {
                            planner_id: plannerId,
                            leg_number: itemLegNumber
                        },
                        order: [
                            ['order_index', 'DESC']
                        ],
                        transaction
                    });

                    // Validate consecutive site
                    if (prevItemInDay && prevItemInDay.site_id === site_id) {
                        throw new Error(`Consecutive site same day: day ${itemLegNumber}`);
                    }

                    // Get order_index for this day
                    const maxIdx = await PlannerItem.max('order_index', {
                        where: {
                            planner_id: plannerId,
                            leg_number: itemLegNumber
                        },
                        transaction
                    });

                    // Create item for this day
                    const newItem = await PlannerItem.create({
                        planner_id: plannerId,
                        site_id: site_id,
                        leg_number: itemLegNumber,
                        event_id: event_id,
                        order_index: (maxIdx || 0) + 1,
                        status: 'upcoming',
                        note: dayItem.note,
                        nearby_amenity_ids: validatedNearbyAmenityIds,
                        estimated_time: itemEstimatedTime,
                        rest_duration: dayItem.rest_duration || rest_duration,
                        travel_time_minutes: travel_time_minutes || null
                    }, { transaction });

                    createdItems.push(newItem);
                }

                await transaction.commit();

                // Fetch all created items with site details
                const results = await PlannerItem.findAll({
                    where: {
                        id: {
                            [Op.in]: createdItems.map(i => i.id)
                        }
                    },
                    include: [
                        { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                    ],
                    order: [
                        ['leg_number', 'ASC'],
                        ['order_index', 'ASC']
                    ]
                });

                Logger.info(`Multi-day event ${event_id} added to planner ${plannerId} for ${multiDayItems.length} days by user ${userId}`);

                const response = {
                    event_id: event_id,
                    event_name: eventInfo ? eventInfo.name : null,
                    total_days: multiDayItems.length,
                    items: results.map(i => this.formatPlannerItemResponse(i))
                };

                if (eventTimeWarning) {
                    response.warning = eventTimeWarning;
                }

                const firstAddedItem = results[0];
                await this.notifyOngoingPlannerMembers(planner, 'planner_item_added', {
                    plannerId: planner.id,
                    plannerName: planner.name || 'Planner',
                    siteName: firstAddedItem?.site?.name || site.name || 'diem den',
                    day: firstAddedItem?.leg_number || leg_number,
                    time: this.normalizePlannerTimeValue(firstAddedItem?.estimated_time)
                }, { excludeUserId: userId });

                return response;
            }

            // ========== SINGLE ITEM CREATION ==========
            // Get next order_index
            const maxOrderIndex = await PlannerItem.max('order_index', {
                where: {
                    planner_id: plannerId,
                    leg_number: leg_number
                },
                transaction
            });

            const nextOrderIndex = (maxOrderIndex || 0) + 1;

            // Determine item status based on planner status
            const itemStatus = 'upcoming';

            // Create planner item
            const item = await PlannerItem.create({
                planner_id: plannerId,
                site_id: site_id,
                leg_number: leg_number,
                event_id: event_id || null,
                order_index: nextOrderIndex,
                status: itemStatus,
                note: note || null,
                nearby_amenity_ids: validatedNearbyAmenityIds,
                estimated_time: finalEstimatedTime,
                rest_duration: rest_duration,
                travel_time_minutes: travel_time_minutes || null
            }, { transaction });

            await transaction.commit();

            // Fetch item with site details
            const result = await PlannerItem.findByPk(item.id, {
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                ]
            });

            Logger.info(`Item added to planner ${plannerId} by user ${userId}${event_id ? ` (event: ${event_id})` : ''}`);

            const response = this.formatPlannerItemResponse(result);

            // Add event info to response if applicable
            if (eventInfo) {
                response.event_info = {
                    id: eventInfo.id,
                    name: eventInfo.name,
                    start_date: eventInfo.start_date,
                    end_date: eventInfo.end_date,
                    start_time: eventInfo.start_time,
                    end_time: eventInfo.end_time
                };
            }

            await this.notifyOngoingPlannerMembers(planner, 'planner_item_added', {
                plannerId: planner.id,
                plannerName: planner.name || 'Planner',
                siteName: result.site?.name || site.name || 'diem den',
                day: result.leg_number,
                time: this.normalizePlannerTimeValue(result.estimated_time)
            }, { excludeUserId: userId });

            if (eventTimeWarning) {
                response.warning = eventTimeWarning;
            }

            return response;
        } catch (error) {
            // Only rollback if transaction is still active
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            Logger.error('Add planner item error:', error);
            throw error;
        }
    }

    /**
     * Delete planner item by ID
     */
    static async reorderPlannerItems(plannerId, userId, legNumber, newOrder) {
        const transaction = await sequelize.transaction();
        try {
            const planner = await Planner.findByPk(plannerId);
            if (!planner) throw new Error('Planner not found');
            if (planner.user_id !== userId) throw new Error('Forbidden');
            if (['ongoing', 'completed', 'cancelled'].includes(planner.status)) throw new Error(`Cannot reorder ${planner.status} plan`);

            const plannerState = await this.getPlannerState(plannerId, planner, { transaction });

            if (planner.status === 'cancelled') {
                throw new Error('Cannot reorder cancelled plan');
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            // Update order_index for each item
            for (let i = 0; i < newOrder.length; i++) {
                await PlannerItem.update(
                    { order_index: i + 1 },
                    { where: { id: newOrder[i], planner_id: plannerId, leg_number: legNumber }, transaction }
                );
            }

            // Recalculate estimated times for all items after reorder
            Logger.info('Recalculating estimated times after reorder...');

            // Fetch all items with site details in new order
            const itemsWithSites = await PlannerItem.findAll({
                where: {
                    planner_id: plannerId,
                    leg_number: legNumber
                },
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image', 'opening_hours'] }
                ],
                order: [['order_index', 'ASC']]
            });

            // Recalculate times for each item (except first)
            // Note: Travel time calculation is handled by mobile app, using 0 for backend calculation
            for (let i = 1; i < itemsWithSites.length; i++) {
                const currentItem = itemsWithSites[i];
                const previousItem = itemsWithSites[i - 1];

                let travelTimeMinutes = 0; // Travel time handled by mobile

                // Calculate new estimated time
                const newEstimatedTime = calculateEstimatedTime(previousItem, travelTimeMinutes, '09:00');

                // Validate opening hours
                if (currentItem.site.opening_hours && planner.start_date) {
                    const startDate = new Date(planner.start_date);
                    const actualDate = new Date(startDate);
                    actualDate.setDate(startDate.getDate() + (legNumber - 1));

                    const openingCheck = isWithinOpeningHours(newEstimatedTime, currentItem.site.opening_hours, actualDate);
                    if (!openingCheck.isOpen) {
                        Logger.warn(`Opening hours validation failed after reorder: ${openingCheck.message}`);
                        throw new Error(openingCheck.message);
                    }
                }

                // Update estimated time
                await currentItem.update({ estimated_time: newEstimatedTime });
                Logger.info(`Updated item ${currentItem.id} estimated_time to ${newEstimatedTime}`);
            }

            // Fetch final updated items
            const updatedItems = await PlannerItem.findAll({
                where: {
                    planner_id: plannerId,
                    leg_number: legNumber
                },
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                ],
                order: [['order_index', 'ASC']]
            });

            Logger.info(`Items reordered and times recalculated in planner ${plannerId} day ${legNumber} by user ${userId}`);

            return {
                items: updatedItems.map(i => this.formatPlannerItemResponse(i))
            };
        } catch (error) {
            await transaction.rollback();
            Logger.error('Reorder planner items error:', error);
            throw error;
        }
    }

    /**
     * Delete planner item and reorder remaining items
     */
    static async deletePlannerItem(plannerId, userId, itemId) {
        const transaction = await sequelize.transaction();

        try {
            // Check planner exists and user is owner
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            const plannerState = await this.getPlannerState(plannerId, planner, { transaction });

            if (planner.status === 'cancelled') {
                throw new Error('Cannot delete cancelled plan');
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            // Get item
            const item = await PlannerItem.findByPk(itemId, { transaction });
            if (!item) {
                throw new Error('Item not found');
            }

            // Block modifications if planner is ongoing, completed or cancelled
            if (['ongoing', 'completed', 'cancelled'].includes(planner.status)) {
                if (planner.status === 'ongoing') {
                    throw new Error('Cannot delete ongoing journey');
                } else if (planner.status === 'completed') {
                    throw new Error('Cannot delete completed plan');
                } else {
                    throw new Error('Cannot delete cancelled plan');
                }
            }

            // Block if item is visited or skipped
            if (item.status === 'visited' || item.status === 'skipped') {
                throw new Error(item.status === 'visited' ? 'Cannot delete visited site' : 'Cannot delete skipped site');
            }

            // Verify item belongs to this planner
            if (item.planner_id !== plannerId) {
                throw new Error('Item does not belong to this planner');
            }

            // ===== VALIDATION: Không được xóa item nếu đang đã chốt (visited/skipped) =====
            // Checkin status guards already handle this indirectly since 'upcoming' is deleteable
            if (item.status !== 'upcoming') {
                throw new Error(`Cannot delete ${item.status} site`);
            }
            // ===== END: Validation =====

            const legNumber = item.leg_number;
            const deletedOrderIndex = item.order_index;

            // ===== VALIDATION: Không được xóa item cuối cùng nếu tạo khoảng trống =====
            // Đếm số items còn lại trong ngày sau khi xóa
            const itemCountInDay = await PlannerItem.count({
                where: {
                    planner_id: plannerId,
                    leg_number: legNumber
                },
                transaction
            });

            // Nếu đây là item cuối cùng của ngày
            if (itemCountInDay === 1) {
                // Kiểm tra xem có ngày nào lớn hơn không
                if (plannerState.hasSharedCommitment && planner.start_date && planner.end_date) {
                    const error = new Error('Cannot make planner incomplete after sharing');
                    error.missingDays = [legNumber];
                    throw error;
                }

                const higherDayExists = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: { [Op.gt]: legNumber }
                    },
                    attributes: ['leg_number'],
                    order: [['leg_number', 'ASC']],
                    transaction
                });

                if (higherDayExists) {
                    throw new Error(`Cannot delete last item gap: day ${legNumber}, higherDay ${higherDayExists.leg_number}`);
                }
            }
            // ===== END: Validation =====

            // Delete item
            await item.destroy({ transaction });

            // Reorder remaining items in the same day
            await PlannerItem.decrement('order_index', {
                by: 1,
                where: {
                    planner_id: plannerId,
                    leg_number: legNumber,
                    order_index: { [Op.gt]: deletedOrderIndex }
                },
                transaction
            });

            await transaction.commit();

            Logger.info(`Item ${itemId} deleted from planner ${plannerId} by user ${userId}`);

            return { id: itemId, message: 'Item deleted successfully' };
        } catch (error) {
            await transaction.rollback();
            Logger.error('Delete planner item error:', error);
            throw error;
        }
    }

    /**
     * Update planner item (estimated_time, rest_duration, note)
     */
    static async updatePlannerItem(plannerId, userId, itemId, updateData) {
        const transaction = await sequelize.transaction();

        try {
            // Check planner exists and user is owner
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            if (userId && planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            const plannerState = await this.getPlannerState(plannerId, planner, { transaction });

            if (planner.status === 'cancelled') {
                throw new Error('Cannot update cancelled plan');
            }

            // Check final lock
            if (plannerState.editLocked) {
                throw new Error('Planner is locked');
            }

            // Get item
            const item = await PlannerItem.findByPk(itemId, {
                include: [{ model: Site, as: 'site' }],
                transaction
            });

            if (!item) {
                throw new Error('Item not found');
            }

            // Block modifications if planner is completed or cancelled
            if (['completed', 'cancelled'].includes(planner.status)) {
                throw new Error(`Cannot update ${planner.status} plan`);
            }

            // Block if item is visited or skipped
            if (item.status === 'visited' || item.status === 'skipped') {
                throw new Error(item.status === 'visited' ? 'Cannot update visited site' : 'Cannot update skipped site');
            }

            if (item.planner_id !== plannerId) {
                throw new Error('Item does not belong to this planner');
            }

            const dataToUpdate = {};
            let eventInfo = null;
            let eventTimeWarning = null;
            const shouldNotifyScheduleChange = planner.status === 'ongoing' && (
                updateData.estimated_time !== undefined ||
                updateData.rest_duration !== undefined ||
                updateData.travel_time_minutes !== undefined
            );

            // Update note
            if (updateData.note !== undefined) {
                dataToUpdate.note = updateData.note;
            }

            // Update nearby_amenity_ids (trust UUID format from validator)
            if (updateData.nearby_amenity_ids !== undefined) {
                const uniqueIds = [...new Set(updateData.nearby_amenity_ids)];
                dataToUpdate.nearby_amenity_ids = uniqueIds;
            }

            // Update rest_duration
            if (updateData.rest_duration !== undefined) {
                dataToUpdate.rest_duration = updateData.rest_duration;
            }

            // Update travel_time_minutes
            if (updateData.travel_time_minutes !== undefined) {
                dataToUpdate.travel_time_minutes = updateData.travel_time_minutes;
            }

            // Update estimated_time
            if (updateData.estimated_time !== undefined) {
                if (item.event_id) {
                    eventInfo = await Event.findByPk(item.event_id, { transaction });
                }

                // Validation: Check if estimated_time is after previous item's departure time + travel time
                const previousItem = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: item.leg_number,
                        order_index: { [Op.lt]: item.order_index }
                    },
                    order: [['order_index', 'DESC']],
                    transaction
                });

                if (previousItem && previousItem.estimated_time) {
                    const [prevHours, prevMins] = previousItem.estimated_time.split(':').map(Number);
                    const prevRestMinutes = parseDurationToMinutes(previousItem.rest_duration) || 0;
                    const prevDepartureMinutes = prevHours * 60 + prevMins + prevRestMinutes;

                    // Use travel_time_minutes from current item or updateData
                    const travelMins = updateData.travel_time_minutes !== undefined
                        ? updateData.travel_time_minutes
                        : (item.travel_time_minutes || 0);
                    const minimumArrivalMinutes = prevDepartureMinutes + travelMins;

                    const [newHours, newMins] = updateData.estimated_time.split(':').map(Number);
                    const newArrivalMinutes = newHours * 60 + newMins;

                    // Format departure time
                    const departureHours = Math.floor(prevDepartureMinutes / 60);
                    const departureMins = prevDepartureMinutes % 60;
                    const departureTimeStr = `${String(departureHours).padStart(2, '0')}:${String(departureMins).padStart(2, '0')}`;

                    // Check if arrival time >= departure time
                    if (newArrivalMinutes < prevDepartureMinutes) {
                        throw new Error(`Invalid arrival time: ${updateData.estimated_time}, departure: ${departureTimeStr}`);
                    }

                    // Check if arrival time >= departure + travel (with 5 min tolerance)
                    if (travelMins > 0 && newArrivalMinutes < minimumArrivalMinutes - 5) {
                        const suggestedArrivalHours = Math.floor(minimumArrivalMinutes / 60) % 24;
                        const suggestedArrivalMins = minimumArrivalMinutes % 60;
                        const suggestedTimeStr = `${String(suggestedArrivalHours).padStart(2, '0')}:${String(suggestedArrivalMins).padStart(2, '0')}`;

                        const travelHours = Math.floor(travelMins / 60);
                        const travelMinsPart = travelMins % 60;
                        const travelStr = travelHours > 0 ? `${travelHours}h ${travelMinsPart}m` : `${travelMinsPart}m`;

                        // If minimum arrival crosses midnight, block it
                        if (minimumArrivalMinutes >= 1440) {
                            throw new Error(`Arrival time past midnight: departure ${departureTimeStr}, travel ${travelStr}, day ${item.leg_number}`);
                        }

                        throw new Error(`Invalid arrival time suggested: ${updateData.estimated_time}, departure ${departureTimeStr}, travel ${travelStr}, suggested ${suggestedTimeStr}`);
                    }
                }

                // Validation: Check for duplicate estimated_time in the same day (exclude current item)
                const existingItemWithSameTime = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        leg_number: item.leg_number,
                        estimated_time: updateData.estimated_time,
                        id: { [Op.ne]: itemId }
                    },
                    transaction
                });

                if (existingItemWithSameTime) {
                    throw new Error(`Duplicate time in day: ${updateData.estimated_time}, day ${item.leg_number}`);
                }

                // Validate opening hours
                if (item.site && item.site.opening_hours && planner.start_date) {
                    const startDate = new Date(planner.start_date);
                    const actualDate = new Date(startDate);
                    actualDate.setDate(startDate.getDate() + (item.leg_number - 1));

                    const openingCheck = isWithinOpeningHours(updateData.estimated_time, item.site.opening_hours, actualDate);
                    if (!openingCheck.isOpen) {
                        throw new Error(openingCheck.message);
                    }
                }

                if (eventInfo) {
                    const timingValidation = this.validateEventTimingForPlannerItem(
                        planner,
                        item.leg_number,
                        updateData.estimated_time,
                        eventInfo
                    );
                    eventTimeWarning = timingValidation.warning;
                }

                dataToUpdate.estimated_time = updateData.estimated_time;
            }

            // Update item
            await item.update(dataToUpdate, { transaction });

            // Recalculate estimated_time for subsequent items if rest_duration or estimated_time changed
            if (updateData.rest_duration !== undefined || updateData.estimated_time !== undefined) {
                const subsequentItems = await PlannerItem.findAll({
                    where: {
                        planner_id: plannerId,
                        leg_number: item.leg_number,
                        order_index: { [Op.gt]: item.order_index }
                    },
                    include: [{ model: Site, as: 'site' }],
                    order: [['order_index', 'ASC']],
                    transaction
                });

                let previousItem = await PlannerItem.findByPk(itemId, { transaction });

                for (const nextItem of subsequentItems) {
                    const newEstimatedTime = calculateEstimatedTime(previousItem, 0, '09:00');

                    // Validate opening hours for each subsequent item
                    if (nextItem.site && nextItem.site.opening_hours && planner.start_date) {
                        const startDate = new Date(planner.start_date);
                        const actualDate = new Date(startDate);
                        actualDate.setDate(startDate.getDate() + (item.leg_number - 1));

                        const openingCheck = isWithinOpeningHours(newEstimatedTime, nextItem.site.opening_hours, actualDate);
                        if (!openingCheck.isOpen) {
                            throw new Error(openingCheck.message);
                        }
                    }

                    await nextItem.update({ estimated_time: newEstimatedTime }, { transaction });
                    previousItem = nextItem;
                }
            }

            await transaction.commit();

            // Fetch updated item
            const result = await PlannerItem.findByPk(itemId, {
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                ]
            });

            Logger.info(`Item ${itemId} updated in planner ${plannerId} by user ${userId}`);

            const response = this.formatPlannerItemResponse(result);
            if (eventTimeWarning) {
                response.warning = eventTimeWarning;
            }

            if (shouldNotifyScheduleChange) {
                const nextUpcomingItem = await this.getNextUpcomingPlannerItem(plannerId);
                if (nextUpcomingItem) {
                    await this.notifyOngoingPlannerMembers(planner, 'planner_schedule_changed', {
                        plannerId: planner.id,
                        plannerName: planner.name || 'Planner',
                        siteName: nextUpcomingItem.site?.name || 'diem den',
                        time: this.normalizePlannerTimeValue(nextUpcomingItem.estimated_time)
                    }, { excludeUserId: userId });
                }
            }

            return response;
        } catch (error) {
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            Logger.error('Update planner item error:', error);
            throw error;
        }
    }

    /**
     * Format planner response
     */
    static formatPlannerResponse(planner) {
        // Tính số ngày từ start_date và end_date
        let numberOfDays = null;
        if (planner.start_date && planner.end_date) {
            const start = new Date(planner.start_date);
            const end = new Date(planner.end_date);
            numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        const effectiveEditLockAt = this.getPlannerEffectiveEditLockAt(planner);
        const statusLockAt = this.getPlannerStatusLockAt(planner);

        return {
            id: planner.id,
            user_id: planner.user_id,
            name: planner.name,
            start_date: planner.start_date,
            end_date: planner.end_date,
            number_of_days: numberOfDays,
            number_of_people: planner.number_of_people,
            transportation: planner.transportation,
            deposit_amount: planner.deposit_amount,
            penalty_percentage: planner.penalty_percentage,
            status: this.getPlannerCurrentStatus(planner),
            planner_lock_at: statusLockAt,
            edit_lock_at: effectiveEditLockAt,
            is_locked: this.isPlannerLocked(planner),
            share_token: planner.share_token,
            qr_code_url: planner.qr_code_url,
            owner: planner.owner ? {
                id: planner.owner.id,
                full_name: planner.owner.full_name,
                email: planner.owner.email,
                avatar_url: planner.owner.avatar_url
            } : null,
            created_at: planner.created_at,
            updated_at: planner.updated_at
        };
    }

    /**
     * Format planner with items grouped by day
     */
    static formatPlannerWithItems(planner) {
        const baseResponse = this.formatPlannerResponse(planner);

        // Group items by day
        const itemsByDay = {};
        if (planner.items) {
            planner.items.forEach(item => {
                if (!itemsByDay[item.leg_number]) {
                    itemsByDay[item.leg_number] = [];
                }
                itemsByDay[item.leg_number].push(this.formatPlannerItemResponse(item));
            });
        }

        return {
            ...baseResponse,
            items_by_day: itemsByDay
        };
    }

    /**
     * Format planner item response
     */
    static formatPlannerItemResponse(item) {
        const { addMinutesToTime, parseDurationToMinutes } = require('../utils/timeCalculation.util');

        // Calculate estimated departure time
        let estimatedDepartureTime = null;
        if (item.estimated_time && item.rest_duration) {
            const restMinutes = parseDurationToMinutes(item.rest_duration);
            estimatedDepartureTime = addMinutesToTime(item.estimated_time, restMinutes);
        }

        return {
            id: item.id,
            planner_id: item.planner_id,
            site_id: item.site_id,
            event_id: item.event_id,
            leg_number: item.leg_number,
            order_index: item.order_index,
            status: item.status,
            note: item.note,
            skip_reason: item.skip_reason,
            skipped_at: item.skipped_at,
            nearby_amenity_ids: item.nearby_amenity_ids || [],
            estimated_time: item.estimated_time,
            rest_duration: item.rest_duration,
            travel_time_minutes: item.travel_time_minutes,
            estimated_departure_time: estimatedDepartureTime,
            // Checkin info
            checkin_latitude: item.checkin_latitude,
            checkin_longitude: item.checkin_longitude,
            checkin_distance_meters: item.checkin_distance_meters,
            checked_in_at: item.checked_in_at,
            site: item.site ? {
                id: item.site.id,
                name: item.site.name,
                code: item.site.code,
                province: item.site.province,
                latitude: item.site.latitude,
                longitude: item.site.longitude,
                cover_image: item.site.cover_image
            } : null,
            created_at: item.created_at,
            updated_at: item.updated_at
        };
    }

    /**
     * Mark planner as completed
     */
    static async completePlanner(plannerId, userId) {
        const t = await sequelize.transaction();
        try {
            const planner = await Planner.findByPk(plannerId, {
                transaction: t,
                lock: true
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            if (planner.status !== 'ongoing') {
                throw new Error('Planner is not ongoing');
            }

            // ===== VALIDATION: Planner phải có đủ items cho tất cả các ngày =====
            const continuityCheck = await this.validatePlannerContinuity(plannerId);

            if (!continuityCheck.isValid) {
                const missingDaysStr = continuityCheck.missingDays.join(', ');
                throw new Error(`Incomplete schedule: missing days ${missingDaysStr}, total days ${continuityCheck.totalDays}`);
            }
            // ===== END: Validation =====

            // Check visitedCount to decide completed vs cancelled
            const checkinStats = await this.getCheckinStats(plannerId);
            const { visitedCount, percentage: checkinPercentage } = checkinStats;

            if (visitedCount > 0) {
                await planner.update({
                    status: 'completed',
                    completed_at: new Date()
                }, { transaction: t });

                const PlannerAntiFraudService = require('./pilgrim/plannerAntiFraudService');
                await PlannerAntiFraudService.verifyAndSettlePlanner(plannerId, t);

                Logger.info(`Planner ${plannerId} completed (${visitedCount} sites visited)`);
            } else {
                await planner.update({ status: 'cancelled' }, { transaction: t });
                Logger.info(`Planner ${plannerId} cancelled (0 sites visited)`);
            }

            await t.commit();

            return this.formatPlannerResponse(planner);
        } catch (error) {
            await t.rollback();
            Logger.error('Complete planner error:', error);
            throw error;
        }
    }

    /**
     * Validate that a planner has items for every day
     * @param {string} plannerId
     */
    static async validatePlannerContinuity(plannerId) {
        const planner = await Planner.findByPk(plannerId);
        if (!planner) throw new Error('Planner not found');

        // Tính tổng số ngày (nếu có start/end date thì tính theo date, nếu ko thì lấy ngày lớn nhất có item)
        let totalDays = 0;
        if (planner.start_date && planner.end_date) {
            const start = new Date(planner.start_date);
            const end = new Date(planner.end_date);
            totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        const items = await PlannerItem.findAll({
            where: { planner_id: plannerId },
            attributes: ['leg_number'],
            raw: true
        });

        if (items.length === 0) {
            return {
                isValid: false,
                missingDays: totalDays > 0 ? Array.from({length: totalDays}, (_, i) => i + 1) : [1],
                totalDays: totalDays || 1
            };
        }

        const maxDayInItems = Math.max(...items.map(i => i.leg_number));
        if (totalDays === 0 || maxDayInItems > totalDays) {
            totalDays = Math.max(totalDays, maxDayInItems);
        }

        const existingDays = new Set(items.map(i => i.leg_number));
        const missingDays = [];

        for (let i = 1; i <= totalDays; i++) {
            if (!existingDays.has(i)) {
                missingDays.push(i);
            }
        }

        return {
            isValid: missingDays.length === 0,
            missingDays,
            totalDays
        };
    }

    /**
     * Get checkin statistics for a planner
     * @returns {Promise<{totalItems: number, checkedInItems: number, percentage: number}>}
     */
    static async getCheckinStats(plannerId) {
        const { PlannerItem } = require('../models');

        // Get total items in planner
        const totalItems = await PlannerItem.count({
            where: { planner_id: plannerId }
        });

        if (totalItems === 0) {
            return { totalItems: 0, checkedInItems: 0, percentage: 0 };
        }

        // Get items with status 'visited' (actual check-ins)
        const visitedCount = await PlannerItem.count({
            where: {
                planner_id: plannerId,
                status: 'visited'
            }
        });

        // Get items with status 'visited' or 'skipped' (counts towards completion percentage)
        const checkedInItems = await PlannerItem.count({
            where: {
                planner_id: plannerId,
                status: {
                    [Op.in]: ['visited', 'skipped']
                }
            }
        });

        const percentage = totalItems > 0 ? Math.round((checkedInItems / totalItems) * 100) : 0;

        return { totalItems, checkedInItems, visitedCount, percentage };
    }


    /**
     * Auto-start planners that have reached their start_date
     * Called by cron job
     */
    static async autoStartPlanners() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Tìm các planner đang 'planning' và đã đến start_date
            const readyPlanners = await Planner.findAll({
                where: {
                    status: { [Op.in]: ['planning', 'locked'] },
                    start_date: {
                        [Op.lte]: today
                    }
                }
            });

            let startedCount = 0;
            for (const planner of readyPlanners) {
                const plannerState = await this.getPlannerState(planner.id, planner);
                if (!['planning', 'locked'].includes(planner.status)) {
                    continue;
                }
                if (!plannerState.scheduleComplete) {
                    continue;
                }

                if (!plannerState.finalLocked) {
                    continue;
                }

                if (planner.number_of_people > 1 && !plannerState.isRealGroup) {
                    continue;
                }

                const shouldBeOngoing = await this.shouldPlannerBeOngoing(planner);
                if (shouldBeOngoing) {
                    await this.markPlannerAsOngoing(planner);
                    startedCount++;
                    
                    // Trigger notification for all members
                    try {
                        const NotificationService = require('./shared/notificationService');
                        const members = await PlannerMember.findAll({
                            where: { planner_id: planner.id, join_status: 'joined' },
                            attributes: ['user_id']
                        });
                        
                        // Notify owner
                        await NotificationService.createNotification('planner_started', planner.user_id, {
                            plannerName: planner.name
                        });
                        
                        // Notify members
                        for (const member of members) {
                            if (member.user_id !== planner.user_id) {
                                await NotificationService.createNotification('planner_started', member.user_id, {
                                    plannerName: planner.name
                                });
                            }
                        }
                    } catch (notifError) {
                        Logger.warn(`Failed to send start notifications for planner ${planner.id}: ${notifError.message}`);
                    }
                    
                    Logger.info(`Planner ${planner.id} auto-started (start_date: ${planner.start_date}, triggered by items)`);
                }
            }

            Logger.info(`Auto-started ${startedCount} planners`);
            return startedCount;
        } catch (error) {
            Logger.error('Auto-start planners error:', error);
            throw error;
        }
    }

    /**
     * Auto-expire ongoing planners that have passed their end_date
     * Called by cron job
     */
    static async autoExpireExpiredPlanners() {
        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            // Find ongoing planners whose end_date has passed
            const expiredPlanners = await Planner.findAll({
                where: {
                    status: 'ongoing',
                    end_date: {
                        [Op.lt]: now
                    }
                }
            });

            let expiredCount = 0;
            for (const planner of expiredPlanners) {
                // Check checkin percentage
                const stats = await this.getCheckinStats(planner.id);

                if (stats.visitedCount === 0) {
                    // 0 items visited → cancel
                    await planner.update({ status: 'cancelled' });
                    expiredCount++;
                    Logger.info(`Planner ${planner.id} auto-cancelled (end_date: ${planner.end_date}, 0 sites visited)`);
                } else {
                    // >= 1 items visited → complete
                    await planner.update({
                        status: 'completed',
                        completed_at: new Date()
                    });
                    Logger.info(`Planner ${planner.id} auto-completed (end_date: ${planner.end_date}, ${stats.visitedCount} sites visited)`);
                }
            }

            Logger.info(`Auto-processed ${expiredCount} expired planners`);
            return expiredCount;
        } catch (error) {
            Logger.error('Auto expire expired planners error:', error);
            throw error;
        }
    }

    /**
     * Start planner - manually change status from 'planning' to 'ongoing'
     * No checkin required - user can start anytime
     */
    static async startPlanner(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            if (!['planning', 'locked'].includes(planner.status)) {
                throw new Error('Planner is not in planning status');
            }

            if (!planner.start_date || !planner.end_date) {
                throw new Error('Planner must have start_date and end_date to start');
            }

            const plannerState = await this.getPlannerState(plannerId, planner);
            if (!['planning', 'locked'].includes(planner.status)) {
                throw new Error('Planner is not in planning status');
            }
            if (!plannerState.scheduleComplete) {
                const missingDaysStr = plannerState.scheduleState.missingDays.join(', ');
                throw new Error(`Incomplete schedule: missing days ${missingDaysStr}, total days ${plannerState.scheduleState.totalDays}`);
            }

            if (planner.number_of_people > 1 && !plannerState.isRealGroup) {
                throw new Error('Group trip requires at least 2 joined members');
            }
            if (!plannerState.finalLocked) {
                throw new Error('Planner must be locked before starting');
            }

            // Start trek (ongoing)
            await this.markPlannerAsOngoing(planner);

            Logger.info(`Planner ${plannerId} started by user ${userId} (planning -> ongoing)`);
            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Start planner error:', error);
            throw error;
        }
    }

    /**
     * Update planner status (unified endpoint for lock/start/complete)
     * @param {string} plannerId - Planner ID
     * @param {string} userId - User ID
     * @param {string} status - New status: 'locked' | 'ongoing' | 'completed' | 'cancelled'
     */
    static async updatePlannerStatus(plannerId, userId, status) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Validate status transitions
            const validTransitions = {
                'planning': ['locked', 'ongoing', 'cancelled'],
                'locked': ['ongoing', 'cancelled'],
                'ongoing': ['completed', 'cancelled']
            };

            if (!validTransitions[planner.status] || !validTransitions[planner.status].includes(status)) {
                throw new Error(`Cannot transition status: from ${planner.status} to ${status}`);
            }

            if (status === 'locked') {
                await planner.update({
                    status: 'locked',
                    is_locked: true
                });

                Logger.info(`Planner ${plannerId} manually locked by user ${userId} (planning -> locked)`);
            }
            // Handle 'ongoing' status (start planner)
            else if (status === 'ongoing') {
                if (!planner.start_date || !planner.end_date) {
                    throw new Error('Planner must have start_date and end_date to start');
                }

                // ===== VALIDATION: Planner phải có đủ items cho tất cả các ngày =====
                const plannerState = await this.getPlannerState(plannerId, planner);
                if (!['planning', 'locked'].includes(planner.status)) {
                    throw new Error('Planner is not in planning status');
                }
                const continuityCheck = plannerState.scheduleState;

                if (!continuityCheck.isValid) {
                    const missingDaysStr = continuityCheck.missingDays.join(', ');
                    throw new Error(`Incomplete schedule: missing days ${missingDaysStr}, total days ${continuityCheck.totalDays}`);
                }
                // ===== END: Validation =====

                // ===== VALIDATION: Group must be locked before starting =====
                if (planner.number_of_people > 1 && !plannerState.isRealGroup) {
                    throw new Error('Group trip requires at least 2 joined members');
                }
                if (!plannerState.finalLocked) {
                    throw new Error('Planner must be locked before starting');
                }
                // ===== END: Validation =====

                await this.markPlannerAsOngoing(planner);

                Logger.info(`Planner ${plannerId} started by user ${userId} (planning -> ongoing)`);
            }
            // Handle 'completed' or 'cancelled' status (complete planner)
            else if (status === 'completed' || status === 'cancelled') {
                // ===== VALIDATION: Planner phải có đủ items cho tất cả các ngày =====
                const continuityCheck = await this.validatePlannerContinuity(plannerId);

                if (!continuityCheck.isValid) {
                    const missingDaysStr = continuityCheck.missingDays.join(', ');
                    throw new Error(`Incomplete schedule: missing days ${missingDaysStr}, total days ${continuityCheck.totalDays}`);
                }
                // ===== END: Validation =====

                // ===== VALIDATION: Check visitedCount =====
                const checkinStats = await this.getCheckinStats(plannerId);
                const { visitedCount, percentage: checkinPercentage } = checkinStats;

                if (status === 'completed' && visitedCount === 0) {
                    throw new Error(`Cannot complete journey: 0 sites visited`);
                }

                // Determine final status based on visitedCount
                const finalStatus = visitedCount > 0 ? 'completed' : 'cancelled';

                const updateData = { status: finalStatus };
                if (finalStatus === 'completed') {
                    updateData.completed_at = new Date();
                }

                await planner.update(updateData);

                Logger.info(`Planner ${plannerId} status updated to ${finalStatus} by user ${userId} (${visitedCount} sites visited)`);
            }

            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Update planner status error:', error);
            throw error;
        }
    }

    /**
     * Auto complete or expire ongoing planners that have passed their end_date
     * Called by cron job
     * Logic:
     * - visitedCount > 0 → status = 'completed'
     * - visitedCount === 0 → status = 'cancelled'
     */
    static async autoCompleteExpiredPlanners() {
        try {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            const expiredPlanners = await Planner.findAll({
                where: {
                    status: 'ongoing',
                    end_date: {
                        [Op.lt]: now
                    }
                }
            });

            let completedCount = 0;
            let expiredCount = 0;

            for (const planner of expiredPlanners) {
                const t = await sequelize.transaction();
                try {
                    const currentPlanner = await Planner.findByPk(planner.id, {
                        transaction: t,
                        lock: true
                    });

                    // Check checkin percentage
                    const stats = await this.getCheckinStats(planner.id);

                    if (stats.visitedCount > 0) {
                        await currentPlanner.update({
                            status: 'completed',
                            completed_at: new Date()
                        }, { transaction: t });

                        const PlannerAntiFraudService = require('./pilgrim/plannerAntiFraudService');
                        await PlannerAntiFraudService.verifyAndSettlePlanner(currentPlanner.id, t);
                        completedCount++;
                        Logger.info(`Planner ${planner.id} auto-completed (${stats.visitedCount} sites visited)`);
                    } else {
                        await currentPlanner.update({ status: 'cancelled' }, { transaction: t });
                        expiredCount++;
                        Logger.info(`Planner ${planner.id} auto-cancelled (0 sites visited)`);
                    }

                    await t.commit();
                } catch (plannerError) {
                    await t.rollback();
                    Logger.error(`Auto complete failed for planner ${planner.id}:`, plannerError);
                }
            }

            Logger.info(`Auto-processed: ${completedCount} completed, ${expiredCount} expired`);
            return { completed: completedCount, expired: expiredCount };
        } catch (error) {
            Logger.error('Auto complete expired planners error:', error);
            throw error;
        }
    }

    static async getJoinedMemberCount(plannerId, options = {}) {
        return PlannerMember.count({
            where: {
                planner_id: plannerId,
                join_status: 'joined'
            },
            transaction: options.transaction
        });
    }

    static async getActiveInviteCount(plannerId, options = {}) {
        const now = options.now || new Date();
        const where = {
            planner_id: plannerId,
            status: { [Op.in]: ['pending', 'awaiting_payment'] },
            [Op.or]: [
                { expires_at: null },
                { expires_at: { [Op.gte]: now } }
            ]
        };

        if (options.excludeInviteId) {
            where.id = { [Op.ne]: options.excludeInviteId };
        }

        return PlannerInvite.count({
            where,
            transaction: options.transaction
        });
    }

    static async getPlannerFirstInviteAt(plannerId, options = {}) {
        const firstInvite = await PlannerInvite.findOne({
            where: { planner_id: plannerId },
            attributes: ['created_at'],
            order: [['created_at', 'ASC']],
            raw: true,
            transaction: options.transaction
        });

        if (!firstInvite?.created_at) {
            return null;
        }

        const firstInviteAt = new Date(firstInvite.created_at);
        return Number.isNaN(firstInviteAt.getTime()) ? null : firstInviteAt;
    }

    static async hasPlannerItems(plannerId, options = {}) {
        const itemCount = await PlannerItem.count({
            where: { planner_id: plannerId },
            transaction: options.transaction
        });

        return itemCount > 0;
    }

    static async expireActivePlannerInvites(plannerId, options = {}) {
        await PlannerInvite.update(
            { status: 'expired' },
            {
                where: {
                    planner_id: plannerId,
                    status: { [Op.in]: ['pending', 'awaiting_payment'] }
                },
                transaction: options.transaction
            }
        );
    }

    static buildSoloFallbackUpdateData(planner, now = new Date()) {
        const soloPlannerSnapshot = {
            ...planner.get({ plain: true }),
            number_of_people: 1
        };
        const soloLockAt = this.getPlannerStatusLockAt(soloPlannerSnapshot);
        const hasReachedSoloLock = Boolean(soloLockAt && now >= soloLockAt);

        return {
            status: hasReachedSoloLock ? 'locked' : 'planning',
            is_locked: hasReachedSoloLock,
            number_of_people: 1,
            deposit_amount: 0,
            penalty_percentage: 0,
            edit_lock_at: null
        };
    }

    static isGroupPlanner(planner) {
        return Boolean(planner && Number(planner.number_of_people) > 1);
    }

    static getPlannerEditLockAvailableAt(firstInviteAt) {
        if (!firstInviteAt) {
            return null;
        }

        const editLockAvailableAt = new Date(firstInviteAt);
        editLockAvailableAt.setHours(editLockAvailableAt.getHours() + PLANNER_EDIT_LOCK_DISCUSSION_HOURS);
        return editLockAvailableAt;
    }

    static getPlannerStartBoundary(planner) {
        if (!planner || !planner.start_date) {
            return null;
        }

        const startBoundary = new Date(planner.start_date);
        startBoundary.setHours(0, 0, 0, 0);
        return Number.isNaN(startBoundary.getTime()) ? null : startBoundary;
    }

    static getPlannerStatusLockAt(planner) {
        const startBoundary = this.getPlannerStartBoundary(planner);
        if (!startBoundary) {
            return null;
        }

        const statusLockAt = new Date(startBoundary);
        if (this.isGroupPlanner(planner)) {
            statusLockAt.setHours(statusLockAt.getHours() - PLANNER_STATUS_LOCK_HOURS);
        }
        return statusLockAt;
    }

    static getPlannerDefaultEditLockAt(planner) {
        const startBoundary = this.getPlannerStartBoundary(planner);
        if (!startBoundary) {
            return null;
        }

        const rawLockDurationHours = Number(planner?.lock_duration_hours);
        const lockDurationHours = Number.isFinite(rawLockDurationHours) && rawLockDurationHours > 0
            ? rawLockDurationHours
            : PLANNER_DEFAULT_LOCK_DURATION_HOURS;

        const editLockAt = new Date(startBoundary);
        editLockAt.setHours(editLockAt.getHours() - lockDurationHours);
        return editLockAt;
    }

    static getPlannerExplicitEditLockAt(planner) {
        if (!planner || !planner.edit_lock_at) {
            return null;
        }

        const editLockAt = new Date(planner.edit_lock_at);
        return Number.isNaN(editLockAt.getTime()) ? null : editLockAt;
    }

    static getPlannerEffectiveEditLockAt(planner) {
        if (!this.isGroupPlanner(planner)) {
            return null;
        }

        return this.getPlannerExplicitEditLockAt(planner) || this.getPlannerDefaultEditLockAt(planner);
    }

    static getPlannerCurrentStatus(planner, now = new Date()) {
        if (!planner) {
            return null;
        }

        if (planner.status !== 'planning') {
            return planner.status;
        }

        const statusLockAt = this.getPlannerStatusLockAt(planner);
        return Boolean(statusLockAt && now >= statusLockAt) ? 'locked' : 'planning';
    }

    static getPlannerJoinDeadline(planner) {
        return this.getPlannerStatusLockAt(planner);
    }

    static isPlannerJoinWindowClosed(planner, now = new Date()) {
        if (!planner || !this.isGroupPlanner(planner)) {
            return false;
        }

        if (planner.status === 'locked') {
            return true;
        }

        const joinDeadline = this.getPlannerJoinDeadline(planner);
        return Boolean(joinDeadline && now >= joinDeadline);
    }

    static async getPlannerScheduleState(plannerId, planner = null, options = {}) {
        const currentPlanner = planner || await Planner.findByPk(plannerId, { transaction: options.transaction });

        if (!currentPlanner) {
            throw new Error('Planner not found');
        }

        if (!currentPlanner.start_date || !currentPlanner.end_date) {
            return {
                isValid: true,
                missingDays: [],
                extraDays: [],
                totalDays: 0,
                existingDays: []
            };
        }

        const startDate = new Date(currentPlanner.start_date);
        const endDate = new Date(currentPlanner.end_date);
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        const items = await PlannerItem.findAll({
            where: { planner_id: plannerId },
            attributes: ['leg_number'],
            group: ['leg_number'],
            raw: true,
            transaction: options.transaction
        });

        const existingDays = [...new Set(items.map(item => Number(item.leg_number)).filter(day => !Number.isNaN(day)))].sort((a, b) => a - b);
        const existingDaysSet = new Set(existingDays);
        const missingDays = [];

        for (let day = 1; day <= totalDays; day++) {
            if (!existingDaysSet.has(day)) {
                missingDays.push(day);
            }
        }

        const extraDays = existingDays.filter(day => day < 1 || day > totalDays);

        return {
            isValid: missingDays.length === 0 && extraDays.length === 0,
            missingDays,
            extraDays,
            totalDays,
            existingDays
        };
    }

    static async getPlannerState(plannerId, planner = null, options = {}) {
        const currentPlanner = planner || await Planner.findByPk(plannerId, { transaction: options.transaction });

        if (!currentPlanner) {
            throw new Error('Planner not found');
        }

        const now = options.now || new Date();
        await this.syncPlannerLockState(currentPlanner, options);

        const [joinedMemberCount, activeInviteCount, scheduleState, firstInviteAt] = await Promise.all([
            this.getJoinedMemberCount(plannerId, options),
            this.getActiveInviteCount(plannerId, options),
            this.getPlannerScheduleState(plannerId, currentPlanner, options),
            this.getPlannerFirstInviteAt(plannerId, options)
        ]);

        const isRealGroup = joinedMemberCount >= 2;
        const hasSharedCommitment = activeInviteCount > 0 || joinedMemberCount > 1;
        const hasDates = Boolean(currentPlanner.start_date && currentPlanner.end_date);
        const joinDeadline = this.getPlannerJoinDeadline(currentPlanner);
        const joinWindowClosed = this.isPlannerJoinWindowClosed(currentPlanner, now);
        const effectiveStatus = this.getPlannerCurrentStatus(currentPlanner, now);
        const finalLocked = effectiveStatus === 'locked';
        const editLocked = this.isPlannerLocked(currentPlanner, now);
        const editLockAvailableAt = this.getPlannerEditLockAvailableAt(firstInviteAt);
        const canSetEditLockAt = Boolean(
            this.isGroupPlanner(currentPlanner) &&
            hasDates &&
            scheduleState.isValid &&
            !editLocked &&
            !joinWindowClosed &&
            editLockAvailableAt &&
            now >= editLockAvailableAt
        );

        return {
            planner: currentPlanner,
            joinedMemberCount,
            activeInviteCount,
            committedSlots: joinedMemberCount + activeInviteCount,
            isRealGroup,
            hasSharedCommitment,
            hasDates,
            effectiveStatus,
            plannerLockAt: joinDeadline,
            editLockAt: this.getPlannerEffectiveEditLockAt(currentPlanner),
            editLocked,
            joinDeadline,
            joinWindowClosed,
            scheduleComplete: scheduleState.isValid,
            scheduleState,
            firstInviteAt,
            editLockAvailableAt,
            canSetEditLockAt,
            finalLocked
        };
    }


    /**
     * Validate that planner has items for ALL days
     * @param {string} plannerId 
     * @returns {Promise<{isValid: boolean, missingDays: number[], totalDays: number}>}
     */
    static async validatePlannerContinuity(plannerId, planner = null, options = {}) {
        try {
            return await this.getPlannerScheduleState(plannerId, planner, options);
        } catch (error) {
            Logger.error('Validate planner continuity error:', error);
            throw error;
        }
    }

    /**
     * Checkin vào một địa điểm trong planner
     * Yêu cầu: checkin theo thứ tự (item trước đó phải visited hoặc skipped)
     */
    static async checkinItem(plannerId, userId, itemId, checkinData) {
        try {
            const { distance_meters, latitude, longitude, note } = checkinData;

            // Get planner
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check access
            if (planner.user_id !== userId) {
                const isMember = await PlannerMember.findOne({
                    where: { planner_id: plannerId, user_id: userId }
                });
                if (!isMember) {
                    throw new Error('Forbidden');
                }
            }

            // Planner must be ongoing
            if (planner.status !== 'ongoing') {
                throw new Error('Planner is not ongoing');
            }

            // Get item
            const item = await PlannerItem.findByPk(itemId);
            if (!item) {
                throw new Error('Item not found');
            }

            // Item must belong to this planner
            if (item.planner_id !== plannerId) {
                throw new Error('Item does not belong to this planner');
            }

            // Item must be in_progress or skipped (can re-checkin after skip)
            // Verify item is upcoming or skipped (if allowing checkin for skipped)
            if (!['upcoming', 'skipped'].includes(item.status)) {
                throw new Error('Item is not available for checkin');
            }

            // Check previous item: must be visited or skipped
            const previousItem = await PlannerItem.findOne({
                where: {
                    planner_id: plannerId,
                    leg_number: item.leg_number,
                    order_index: { [Op.lt]: item.order_index }
                },
                order: [['order_index', 'DESC']]
            });

            if (previousItem && !['visited', 'skipped'].includes(previousItem.status)) {
                throw new Error(`Complete previous item first: site ${previousItem.site?.name || 'preceding'}`);
            }

            // Update item with checkin info
            await item.update({
                status: 'visited',
                checked_in_at: new Date(),
                checkin_latitude: latitude || null,
                checkin_longitude: longitude || null,
                checkin_distance_meters: distance_meters || null
            });

            Logger.info(`Item ${itemId} checked in (visited) by user ${userId} at planner ${plannerId}`);

            // Return updated item with site info
            const updatedItem = await PlannerItem.findByPk(itemId, {
                include: [{ model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }]
            });

            return this.formatPlannerItemResponse(updatedItem);
        } catch (error) {
            Logger.error('Checkin item error:', error);
            throw error;
        }
    }

    /**
     * Helper to determine if a planner should transition to 'ongoing'
     * Logic: 2 hours before the estimated_time of the first task on start_date
     * If no tasks or no time, defaults to 00:00 of start_date
     */
    static async shouldPlannerBeOngoing(planner) {
        if (!planner || !['planning', 'locked'].includes(planner.status) || !planner.start_date) {
            return false;
        }

        const now = new Date();
        const startDate = new Date(planner.start_date);
        startDate.setHours(0, 0, 0, 0);

        // If today is before start_date, definitely not ongoing
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today < startDate) {
            return false;
        }

        // If today is after start_date, it's already overdue, should be ongoing
        if (today > startDate) {
            return true;
        }

        // It's the start_date. Check for the first mission's estimated_time
        const firstItem = await PlannerItem.findOne({
            where: { planner_id: planner.id },
            order: [
                ['leg_number', 'ASC'],
                ['order_index', 'ASC']
            ]
        });

        // Default behavior if no items found or no estimated_time: start at midnight
        if (!firstItem || !firstItem.estimated_time) {
            return true;
        }

        // firstItem.estimated_time is "HH:mm:ss"
        const [hours, minutes, seconds] = firstItem.estimated_time.split(':').map(Number);
        
        // Combine start_date with estimated_time
        const triggerTime = new Date(startDate);
        triggerTime.setHours(hours, minutes, seconds || 0, 0);
        
        // Subtract 2 hours
        triggerTime.setHours(triggerTime.getHours() - 2);

        return now >= triggerTime;
    }

    /**
     * Check if a planner is currently in its locked period
     */
    static isPlannerLocked(planner, now = new Date()) {
        if (!planner || !['planning', 'locked'].includes(planner.status)) {
            return false;
        }

        if (planner.status === 'locked') {
            return true;
        }

        const statusLockAt = this.getPlannerStatusLockAt(planner);
        if (!this.isGroupPlanner(planner)) {
            return Boolean(statusLockAt && now >= statusLockAt);
        }

        if (planner.is_locked) {
            return true;
        }

        const editLockAt = this.getPlannerEffectiveEditLockAt(planner);
        if (!editLockAt) {
            return false;
        }

        return now >= editLockAt;
    }

    static async syncPlannerLockState(planner, options = {}) {
        if (!planner || !['planning', 'locked'].includes(planner.status)) {
            return planner;
        }

        const now = options.now || new Date();
        const isGroupPlanner = this.isGroupPlanner(planner);
        const editLockAt = isGroupPlanner ? this.getPlannerEffectiveEditLockAt(planner) : null;
        const statusLockAt = this.getPlannerStatusLockAt(planner);
        const updateData = {};

        if (isGroupPlanner && !planner.is_locked && editLockAt && now >= editLockAt) {
            updateData.is_locked = true;
        }

        if (statusLockAt && now >= statusLockAt) {
            const hasPlannerItems = await this.hasPlannerItems(planner.id, options);

            if (!hasPlannerItems) {
                updateData.status = 'cancelled';
                updateData.is_locked = false;
            } else if (isGroupPlanner) {
                const [joinedMemberCount, activeInviteCount] = await Promise.all([
                    this.getJoinedMemberCount(planner.id, options),
                    this.getActiveInviteCount(planner.id, options)
                ]);

                if (joinedMemberCount <= 1) {
                    if (activeInviteCount > 0) {
                        await this.expireActivePlannerInvites(planner.id, options);
                    }
                    Object.assign(updateData, this.buildSoloFallbackUpdateData(planner, now));
                } else if (planner.status === 'planning') {
                    updateData.status = 'locked';
                    updateData.is_locked = true;
                }
            } else if (planner.status === 'planning') {
                updateData.status = 'locked';
                updateData.is_locked = true;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return planner;
        }

        const updateOptions = {};
        if (options.transaction) {
            updateOptions.transaction = options.transaction;
        }

        await planner.update(updateData, updateOptions);
        Object.assign(planner, updateData);
        return planner;
    }

    /**
     * Manually toggle planner lock (manual override)
     */
    static async togglePlannerLock(plannerId, userId, isLocked) {
        try {
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Group journeys only (consistent with auto-lock)
            if (planner.number_of_people < 2) {
                throw new Error('Only group journeys can be locked');
            }

            const plannerState = await this.getPlannerState(plannerId, planner);

            if (isLocked) {
                if (plannerState.editLocked) {
                    throw new Error('Planner is locked');
                }

                if (!plannerState.hasDates || !plannerState.scheduleComplete) {
                    throw new Error('Edit lock requires complete schedule');
                }

                if (!plannerState.firstInviteAt) {
                    throw new Error('Edit lock requires first invite');
                }

                if (!plannerState.editLockAvailableAt || !plannerState.canSetEditLockAt) {
                    const error = new Error('Edit lock requires discussion period');
                    error.editLockAvailableAt = plannerState.editLockAvailableAt;
                    throw error;
                }

                await planner.update({
                    is_locked: true,
                    edit_lock_at: new Date()
                });
            } else {
                if (planner.status === 'locked' || this.isPlannerLocked(planner)) {
                    throw new Error('Cannot unlock once the journey is locked');
                }

                await planner.update({
                    is_locked: false,
                    edit_lock_at: null
                });
            }

            Logger.info(`Planner ${plannerId} manual lock set to ${isLocked} by user ${userId}`);
            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Toggle planner lock error:', error);
            throw error;
        }
    }
}

module.exports = PlannerService;
