const { Planner, PlannerItem, User, Site, PlannerInvite, PlannerMember, NearbyPlace } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const sequelize = require('../config/database');
const crypto = require('crypto');
const EmailService = require('./shared/emailService');
const QRCode = require('qrcode');
const { calculateEstimatedTime, parseDurationToMinutes, isWithinOpeningHours } = require('../utils/timeCalculation.util');

class PlannerService {

    /**
     * Create a new planner
     */
    static async createPlanner(userId, plannerData) {
        try {
            const { name, start_date, end_date, number_of_people = 1, transportation } = plannerData;

            // Validate required fields
            if (!name || name.trim().length === 0) {
                throw new Error('Name is required');
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
                    where: { user_id: userId },
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

            // Create planner
            const planner = await Planner.create({
                user_id: userId,
                name: name.trim(),
                start_date: start_date || null,
                end_date: end_date || null,
                number_of_people,
                transportation: transportation || null,
                status: 'planning'
            });

            Logger.info(`Planner created by user ${userId}: ${planner.id}`);
            return this.formatPlannerResponse(planner);
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
                where: { user_id: userId },
                attributes: ['planner_id']
            });
            const joinedPlannerIds = memberPlanners.map(m => m.planner_id);

            const { rows: planners, count: total } = await Planner.findAndCountAll({
                where: {
                    is_active: true,
                    [Op.or]: [
                        { user_id: userId }, // Planner do user tạo
                        { id: { [Op.in]: joinedPlannerIds } } // Planner mà user tham gia
                    ]
                },
                include: [
                    { model: User, as: 'owner', attributes: ['id', 'full_name', 'email', 'avatar_url'] }
                ],
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            });

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
                        order: [['day_number', 'ASC'], ['order_index', 'ASC']]
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
                        user_id: userId
                    }
                });

                if (!isMember) {
                    throw new Error('Forbidden');
                }
            }

            return this.formatPlannerWithItems(planner);
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

            // Prepare update data
            const dataToUpdate = {};

            if (updateData.name !== undefined) {
                dataToUpdate.name = updateData.name.trim();
            }

            if (updateData.start_date !== undefined) {
                dataToUpdate.start_date = updateData.start_date;
            }

            if (updateData.end_date !== undefined) {
                dataToUpdate.end_date = updateData.end_date;
            }

            // Validate date range if both dates are being updated
            const finalStartDate = dataToUpdate.start_date !== undefined ? dataToUpdate.start_date : planner.start_date;
            const finalEndDate = dataToUpdate.end_date !== undefined ? dataToUpdate.end_date : planner.end_date;

            if (finalStartDate && finalEndDate) {
                const startDateObj = new Date(finalStartDate);
                const endDateObj = new Date(finalEndDate);
                if (endDateObj < startDateObj) {
                    throw new Error('End date must be after or equal to start date');
                }

                // Validate max 30 days
                const diffTime = endDateObj.getTime() - startDateObj.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
                if (diffDays > 30) {
                    throw new Error('Planner exceeds 30 days');
                }

                // Check overlapping dates with existing planners (exclude current planner)
                const overlappingPlanners = await Planner.findAll({
                    where: {
                        user_id: userId,
                        id: { [Op.ne]: plannerId },
                        start_date: { [Op.ne]: null },
                        end_date: { [Op.ne]: null },
                        [Op.and]: [
                            { start_date: { [Op.lte]: finalEndDate } },
                            { end_date: { [Op.gte]: finalStartDate } }
                        ]
                    },
                    attributes: ['id', 'name', 'start_date', 'end_date']
                });

                if (overlappingPlanners.length > 0) {
                    const conflictDates = new Set();
                    const reqStart = new Date(finalStartDate);
                    const reqEnd = new Date(finalEndDate);

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

            if (updateData.number_of_people !== undefined) {
                if (updateData.number_of_people < 1) {
                    throw new Error('Number of people must be at least 1');
                }
                dataToUpdate.number_of_people = updateData.number_of_people;
            }

            if (updateData.transportation !== undefined) {
                dataToUpdate.transportation = updateData.transportation;
            }


            if (updateData.status !== undefined) {
                dataToUpdate.status = updateData.status;
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
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Soft delete - set is_active to false
            await planner.update({ is_active: false });

            Logger.info(`Planner soft deleted by user ${userId}: ${plannerId}`);
            return { id: plannerId, message: 'Planner deleted successfully' };
        } catch (error) {
            Logger.error('Delete planner error:', error);
            throw error;
        }
    }

    /**
     * Add item to planner with distance validation
     * userId is optional - if not provided, skips ownership check (for token access)
     * 
     * If event_id is provided:
     * - Auto-calculate day_number from event.start_date vs planner.start_date
     * - Auto-calculate estimated_time from event.start_time
     * - Auto-calculate rest_duration from event.start_time to event.end_time
     * - If event spans multiple days, create items for each day
     */
    static async addPlannerItem(plannerId, userId = null, itemData) {
        const transaction = await sequelize.transaction();

        try {
            let { site_id, day_number, note, nearby_amenity_ids, estimated_time, rest_duration, travel_time_minutes, event_id } = itemData;

            // ========== EVENT HANDLING ==========
            let eventInfo = null;
            let multiDayItems = null; // For multi-day events

            if (event_id) {
                const { Event } = require('../models');
                const event = await Event.findByPk(event_id);

                if (!event) {
                    throw new Error('Event not found');
                }

                if (event.status !== 'approved' || !event.is_active) {
                    throw new Error('Event is not available');
                }

                eventInfo = event;

                // Get planner to calculate day_number
                const planner = await Planner.findByPk(plannerId);
                if (!planner) {
                    throw new Error('Planner not found');
                }

                if (!planner.start_date || !planner.end_date) {
                    throw new Error('Planner must have start_date and end_date to add events');
                }

                // Use event's site_id if not provided
                if (!site_id) {
                    site_id = event.site_id;
                }

                // Calculate day_number from event.start_date
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

                // Calculate day_number (1-based)
                const calculatedDayNumber = Math.ceil((eventStartDate - plannerStartDate) / (1000 * 60 * 60 * 24)) + 1;

                // Override day_number with calculated value
                day_number = calculatedDayNumber;
                Logger.info(`Event ${event.name}: auto-calculated day_number = ${day_number}`);

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
                            day_number: calculatedDayNumber + i,
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
                        id: { [Op.in]: uniqueIds },
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

            if (userId && planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Check site exists
            const site = await Site.findByPk(site_id);
            if (!site) {
                throw new Error('Site not found');
            }

            // Validate day_number (if planner has date range)
            if (planner.start_date && planner.end_date) {
                const startDate = new Date(planner.start_date);
                const endDate = new Date(planner.end_date);
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                if (day_number < 1 || day_number > totalDays) {
                    throw new Error(`Invalid day number. Must be between 1 and ${totalDays}`);
                }
            } else if (day_number < 1) {
                throw new Error('Day number must be at least 1');
            }

            // ===== VALIDATION: Không được bỏ trống ngày trước đó =====
            if (day_number > 1 && !multiDayItems) {
                // Lấy tất cả các ngày đã có items
                const existingDays = await PlannerItem.findAll({
                    where: { planner_id: plannerId },
                    attributes: [[sequelize.fn('DISTINCT', sequelize.col('day_number')), 'day_number']],
                    raw: true
                });

                const dayNumbersSet = new Set(existingDays.map(d => d.day_number));

                // Kiểm tra các ngày từ 1 đến day_number-1
                const missingDays = [];
                for (let i = 1; i < day_number; i++) {
                    if (!dayNumbersSet.has(i)) {
                        missingDays.push(i);
                    }
                }

                if (missingDays.length > 0) {
                    throw new Error(
                        `Bạn không thể thêm địa điểm cho Ngày ${day_number} khi chưa có địa điểm cho ` +
                        `Ngày ${missingDays.join(', ')}. Vui lòng thêm địa điểm theo thứ tự.`
                    );
                }
            }
            // ===== END: Validation =====

            let travelTimeMinutes = 0;

            // Get previous site in same day (if exists)
            const previousItem = await PlannerItem.findOne({
                where: {
                    planner_id: plannerId,
                    day_number: day_number
                },
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'latitude', 'longitude'] }
                ],
                order: [['order_index', 'DESC']],
                transaction
            });

            // Validation: Cannot add the same site consecutively
            if (previousItem && previousItem.site_id === site_id) {
                throw new Error('Cannot add the same site consecutively. Please add a different site or move to the next day.');
            }

            // Validation: Check if travel time causes arrival to next day
            if (previousItem && previousItem.estimated_time && travel_time_minutes && travel_time_minutes > 0) {
                const [prevHours, prevMins] = previousItem.estimated_time.split(':').map(Number);
                const prevRestMinutes = parseDurationToMinutes(previousItem.rest_duration) || 0;

                // Calculate arrival time = previous estimated_time + previous rest_duration + travel_time
                const arrivalMinutes = prevHours * 60 + prevMins + prevRestMinutes + travel_time_minutes;

                // If arrival time >= 24:00 (1440 minutes), it's next day
                if (arrivalMinutes >= 1440) {
                    throw new Error(`Thời gian di chuyển vượt quá ngày hiện tại (${Math.floor(travel_time_minutes / 60)} giờ ${travel_time_minutes % 60} phút). Không thể thêm địa điểm này vào lịch trình của ngày ${day_number}.`);
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
                        throw new Error(`Thời gian đến ${finalEstimatedTime} không hợp lệ. Địa điểm trước đó rời đi lúc ${departureTimeStr}. Vui lòng chọn thời gian sau ${departureTimeStr}.`);
                    }

                    // Check if arrival time >= departure + travel (with 5 min tolerance)
                    if (travelMins > 0 && newArrivalMinutes < minimumArrivalMinutes - 5) {
                        const suggestedArrivalHours = Math.floor(minimumArrivalMinutes / 60) % 24;
                        const suggestedArrivalMins = minimumArrivalMinutes % 60;
                        const suggestedTimeStr = `${String(suggestedArrivalHours).padStart(2, '0')}:${String(suggestedArrivalMins).padStart(2, '0')}`;

                        const travelHours = Math.floor(travelMins / 60);
                        const travelMinsPart = travelMins % 60;
                        const travelStr = travelHours > 0 ? `${travelHours} giờ ${travelMinsPart} phút` : `${travelMinsPart} phút`;

                        // If minimum arrival crosses midnight, block it
                        if (minimumArrivalMinutes >= 1440) {
                            throw new Error(`Thời gian đến không hợp lệ. Rời lúc ${departureTimeStr} + ${travelStr} di chuyển = qua ngày hôm sau. Không thể thêm địa điểm này vào lịch trình của ngày ${day_number}.`);
                        }

                        throw new Error(`Thời gian đến ${finalEstimatedTime} không hợp lệ. Rời lúc ${departureTimeStr} + ${travelStr} di chuyển = đến khoảng ${suggestedTimeStr}. Vui lòng chọn thời gian từ ${suggestedTimeStr} trở đi.`);
                    }
                }

                // Validation: Check for duplicate estimated_time in the same day
                const existingItemWithSameTime = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        day_number: day_number,
                        estimated_time: finalEstimatedTime
                    },
                    transaction
                });

                if (existingItemWithSameTime) {
                    throw new Error(`Đã có địa điểm khác với giờ ${finalEstimatedTime} trong ngày ${day_number}. Vui lòng chọn thời gian khác.`);
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
                        day_number: day_number
                    },
                    order: [['order_index', 'ASC']],
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
                        throw new Error(`Total time for day ${day_number} exceeds 24 hours (${Math.floor(totalDayMinutes / 60)} hours). Please split into multiple days.`);
                    }
                }
            }

            // Validation 3: Check if estimated_time falls within site's opening hours (skip for events)
            if (!event_id && site.opening_hours && planner.start_date) {
                // Calculate the actual date for this day_number
                const startDate = new Date(planner.start_date);
                const actualDate = new Date(startDate);
                actualDate.setDate(startDate.getDate() + (day_number - 1));

                const openingCheck = isWithinOpeningHours(finalEstimatedTime, site.opening_hours, actualDate);
                if (!openingCheck.isOpen) {
                    Logger.warn(`Opening hours validation failed: ${openingCheck.message}`);
                    throw new Error(openingCheck.message);
                }
            }

            // ========== HANDLE MULTI-DAY EVENTS ==========
            if (multiDayItems && multiDayItems.length > 1) {
                const createdItems = [];

                for (let i = 0; i < multiDayItems.length; i++) {
                    const dayItem = multiDayItems[i];
                    const itemDayNumber = dayItem.day_number;

                    // Get previous item in this day
                    const prevItemInDay = await PlannerItem.findOne({
                        where: {
                            planner_id: plannerId,
                            day_number: itemDayNumber
                        },
                        order: [['order_index', 'DESC']],
                        transaction
                    });

                    // Validate consecutive site
                    if (prevItemInDay && prevItemInDay.site_id === site_id) {
                        throw new Error(`Ngày ${itemDayNumber}: Không thể thêm cùng địa điểm liên tiếp.`);
                    }

                    // Get order_index for this day
                    const maxIdx = await PlannerItem.max('order_index', {
                        where: {
                            planner_id: plannerId,
                            day_number: itemDayNumber
                        },
                        transaction
                    });

                    // Create item for this day
                    const newItem = await PlannerItem.create({
                        planner_id: plannerId,
                        site_id: site_id,
                        day_number: itemDayNumber,
                        event_id: event_id,
                        order_index: (maxIdx || 0) + 1,
                        note: dayItem.note,
                        nearby_amenity_ids: validatedNearbyAmenityIds,
                        estimated_time: dayItem.estimated_time || finalEstimatedTime,
                        rest_duration: dayItem.rest_duration || rest_duration,
                        travel_time_minutes: travel_time_minutes || null
                    }, { transaction });

                    createdItems.push(newItem);
                }

                await transaction.commit();

                // Fetch all created items with site details
                const results = await PlannerItem.findAll({
                    where: {
                        id: { [Op.in]: createdItems.map(i => i.id) }
                    },
                    include: [
                        { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                    ],
                    order: [['day_number', 'ASC'], ['order_index', 'ASC']]
                });

                Logger.info(`Multi-day event ${event_id} added to planner ${plannerId} for ${multiDayItems.length} days by user ${userId}`);

                return {
                    event_id: event_id,
                    event_name: eventInfo?.name,
                    total_days: multiDayItems.length,
                    items: results.map(i => this.formatPlannerItemResponse(i))
                };
            }

            // ========== SINGLE ITEM CREATION ==========
            // Get next order_index
            const maxOrderIndex = await PlannerItem.max('order_index', {
                where: {
                    planner_id: plannerId,
                    day_number: day_number
                },
                transaction
            });

            const nextOrderIndex = (maxOrderIndex || 0) + 1;

            // Create planner item
            const item = await PlannerItem.create({
                planner_id: plannerId,
                site_id: site_id,
                day_number: day_number,
                event_id: event_id || null,
                order_index: nextOrderIndex,
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
     * Reorder planner items within a day
     * userId is optional - if not provided, skips ownership check (for token access)
     */
    static async reorderPlannerItems(plannerId, userId = null, dayNumber, itemIds) {
        const transaction = await sequelize.transaction();

        try {
            // Check planner exists and user is owner (if userId provided)
            const planner = await Planner.findByPk(plannerId);
            if (!planner) {
                throw new Error('Planner not found');
            }

            if (userId && planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Validate day_number (if planner has date range)
            if (planner.start_date && planner.end_date) {
                const startDate = new Date(planner.start_date);
                const endDate = new Date(planner.end_date);
                const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

                if (dayNumber < 1 || dayNumber > totalDays) {
                    throw new Error(`Invalid day number. Must be between 1 and ${totalDays}`);
                }
            } else if (dayNumber < 1) {
                throw new Error('Day number must be at least 1');
            }

            // Get all items for this day
            const items = await PlannerItem.findAll({
                where: {
                    planner_id: plannerId,
                    day_number: dayNumber
                },
                transaction
            });

            // Validate all item IDs belong to this day
            const itemIdSet = new Set(items.map(i => i.id));
            for (const id of itemIds) {
                if (!itemIdSet.has(id)) {
                    throw new Error('Invalid item ID in reorder list');
                }
            }

            // Step 1: Set all order_index to temporary negative values to avoid unique constraint conflict
            for (let i = 0; i < itemIds.length; i++) {
                await PlannerItem.update(
                    { order_index: -(i + 1000) },
                    {
                        where: { id: itemIds[i] },
                        transaction
                    }
                );
            }

            // Step 2: Update order_index to final values
            for (let i = 0; i < itemIds.length; i++) {
                await PlannerItem.update(
                    { order_index: i + 1 },
                    {
                        where: { id: itemIds[i] },
                        transaction
                    }
                );
            }

            await transaction.commit();

            // Recalculate estimated times for all items after reorder
            Logger.info('Recalculating estimated times after reorder...');

            // Fetch all items with site details in new order
            const itemsWithSites = await PlannerItem.findAll({
                where: {
                    planner_id: plannerId,
                    day_number: dayNumber
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
                    actualDate.setDate(startDate.getDate() + (dayNumber - 1));

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
                    day_number: dayNumber
                },
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                ],
                order: [['order_index', 'ASC']]
            });

            Logger.info(`Items reordered and times recalculated in planner ${plannerId} day ${dayNumber} by user ${userId}`);

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

            // Get item
            const item = await PlannerItem.findByPk(itemId, { transaction });
            if (!item) {
                throw new Error('Item not found');
            }

            // Verify item belongs to this planner
            if (item.planner_id !== plannerId) {
                throw new Error('Item does not belong to this planner');
            }

            const dayNumber = item.day_number;
            const deletedOrderIndex = item.order_index;

            // ===== VALIDATION: Không được xóa item cuối cùng nếu tạo khoảng trống =====
            // Đếm số items còn lại trong ngày sau khi xóa
            const itemCountInDay = await PlannerItem.count({
                where: {
                    planner_id: plannerId,
                    day_number: dayNumber
                },
                transaction
            });

            // Nếu đây là item cuối cùng của ngày
            if (itemCountInDay === 1) {
                // Kiểm tra xem có ngày nào lớn hơn không
                const higherDayExists = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        day_number: { [Op.gt]: dayNumber }
                    },
                    attributes: ['day_number'],
                    order: [['day_number', 'ASC']],
                    transaction
                });

                if (higherDayExists) {
                    throw new Error(
                        `Không thể xóa địa điểm cuối cùng của Ngày ${dayNumber} vì bạn đã có địa điểm cho ` +
                        `Ngày ${higherDayExists.day_number}. Xin vui lòng xóa các ngày sau trước hoặc thêm địa điểm khác cho Ngày ${dayNumber}.`
                    );
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
                    day_number: dayNumber,
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

            // Get item
            const item = await PlannerItem.findByPk(itemId, {
                include: [{ model: Site, as: 'site' }],
                transaction
            });

            if (!item) {
                throw new Error('Item not found');
            }

            if (item.planner_id !== plannerId) {
                throw new Error('Item does not belong to this planner');
            }

            const dataToUpdate = {};

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
                // Validation: Check if estimated_time is after previous item's departure time + travel time
                const previousItem = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        day_number: item.day_number,
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
                        throw new Error(`Thời gian đến ${updateData.estimated_time} không hợp lệ. Địa điểm trước đó rời đi lúc ${departureTimeStr}. Vui lòng chọn thời gian sau ${departureTimeStr}.`);
                    }

                    // Check if arrival time >= departure + travel (with 5 min tolerance)
                    if (travelMins > 0 && newArrivalMinutes < minimumArrivalMinutes - 5) {
                        const suggestedArrivalHours = Math.floor(minimumArrivalMinutes / 60) % 24;
                        const suggestedArrivalMins = minimumArrivalMinutes % 60;
                        const suggestedTimeStr = `${String(suggestedArrivalHours).padStart(2, '0')}:${String(suggestedArrivalMins).padStart(2, '0')}`;

                        const travelHours = Math.floor(travelMins / 60);
                        const travelMinsPart = travelMins % 60;
                        const travelStr = travelHours > 0 ? `${travelHours} giờ ${travelMinsPart} phút` : `${travelMinsPart} phút`;

                        // If minimum arrival crosses midnight, block it
                        if (minimumArrivalMinutes >= 1440) {
                            throw new Error(`Thời gian đến không hợp lệ. Rời lúc ${departureTimeStr} + ${travelStr} di chuyển = qua ngày hôm sau. Không thể cập nhật địa điểm này vào lịch trình của ngày ${item.day_number}.`);
                        }

                        throw new Error(`Thời gian đến ${updateData.estimated_time} không hợp lệ. Rời lúc ${departureTimeStr} + ${travelStr} di chuyển = đến khoảng ${suggestedTimeStr}. Vui lòng chọn thời gian từ ${suggestedTimeStr} trở đi.`);
                    }
                }

                // Validation: Check for duplicate estimated_time in the same day (exclude current item)
                const existingItemWithSameTime = await PlannerItem.findOne({
                    where: {
                        planner_id: plannerId,
                        day_number: item.day_number,
                        estimated_time: updateData.estimated_time,
                        id: { [Op.ne]: itemId }
                    },
                    transaction
                });

                if (existingItemWithSameTime) {
                    throw new Error(`Đã có địa điểm khác với giờ ${updateData.estimated_time} trong ngày ${item.day_number}. Vui lòng chọn thời gian khác.`);
                }

                // Validate opening hours
                if (item.site && item.site.opening_hours && planner.start_date) {
                    const startDate = new Date(planner.start_date);
                    const actualDate = new Date(startDate);
                    actualDate.setDate(startDate.getDate() + (item.day_number - 1));

                    const openingCheck = isWithinOpeningHours(updateData.estimated_time, item.site.opening_hours, actualDate);
                    if (!openingCheck.isOpen) {
                        throw new Error(openingCheck.message);
                    }
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
                        day_number: item.day_number,
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
                        actualDate.setDate(startDate.getDate() + (item.day_number - 1));

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

            return this.formatPlannerItemResponse(result);
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
        // Calculate number_of_days from date range
        let numberOfDays = null;
        if (planner.start_date && planner.end_date) {
            const startDate = new Date(planner.start_date);
            const endDate = new Date(planner.end_date);
            numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        }

        return {
            id: planner.id,
            user_id: planner.user_id,
            name: planner.name,
            start_date: planner.start_date,
            end_date: planner.end_date,
            number_of_days: numberOfDays,
            number_of_people: planner.number_of_people,
            transportation: planner.transportation,

            status: planner.status,
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
                if (!itemsByDay[item.day_number]) {
                    itemsByDay[item.day_number] = [];
                }
                itemsByDay[item.day_number].push(this.formatPlannerItemResponse(item));
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
            day_number: item.day_number,
            order_index: item.order_index,
            note: item.note,
            nearby_amenity_ids: item.nearby_amenity_ids || [],
            estimated_time: item.estimated_time,
            rest_duration: item.rest_duration,
            travel_time_minutes: item.travel_time_minutes,
            estimated_departure_time: estimatedDepartureTime,
            site: item.site ? {
                id: item.site.id,
                name: item.site.name,
                code: item.site.code,
                province: item.site.province,
                latitude: item.site.latitude,
                longitude: item.site.longitude,
                cover_image: item.site.cover_image
            } : null,
            created_at: item.created_at
        };
    }

    /**
     * Mark planner as completed
     */
    static async completePlanner(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId);

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
                throw new Error(
                    `Không thể hoàn thành kế hoạch! Lịch trình chưa đầy đủ. ` +
                    `Bạn cần thêm địa điểm cho Ngày ${missingDaysStr} (Tổng ${continuityCheck.totalDays} ngày).`
                );
            }
            // ===== END: Validation =====

            await planner.update({
                status: 'completed',
                completed_at: new Date()
            });

            Logger.info(`Planner ${plannerId} marked as completed by user ${userId}`);
            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Complete planner error:', error);
            throw error;
        }
    }

    /**
     * Auto complete ongoing planners that have passed their end_date
     * Called by cron job
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
            for (const planner of expiredPlanners) {
                await planner.update({
                    status: 'completed',
                    completed_at: new Date()
                });
                completedCount++;
            }

            Logger.info(`Auto-completed ${completedCount} expired planners`);
            return completedCount;
        } catch (error) {
            Logger.error('Auto complete expired planners error:', error);
            throw error;
        }
    }


    /**
     * Validate that planner has items for ALL days
     * @param {string} plannerId 
     * @returns {Promise<{isValid: boolean, missingDays: number[], totalDays: number}>}
     */
    static async validatePlannerContinuity(plannerId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // If no dates, skip validation (flexible planner)
            if (!planner.start_date || !planner.end_date) {
                return { isValid: true, missingDays: [], totalDays: 0 };
            }

            // Calculate total days
            const startDate = new Date(planner.start_date);
            const endDate = new Date(planner.end_date);
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            // Get all planner items
            const items = await PlannerItem.findAll({
                where: { planner_id: plannerId },
                attributes: ['day_number'],
                group: ['day_number'],
                raw: true
            });

            const existingDays = new Set(items.map(item => item.day_number));
            const missingDays = [];

            // Check each day from 1 to totalDays
            for (let day = 1; day <= totalDays; day++) {
                if (!existingDays.has(day)) {
                    missingDays.push(day);
                }
            }

            return {
                isValid: missingDays.length === 0,
                missingDays,
                totalDays
            };
        } catch (error) {
            Logger.error('Validate planner continuity error:', error);
            throw error;
        }
    }
}

module.exports = PlannerService;
