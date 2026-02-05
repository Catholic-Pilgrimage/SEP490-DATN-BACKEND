const { Planner, PlannerItem, User, Site } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const OSRMUtil = require('../utils/osrm.util');
const sequelize = require('../config/database');
const crypto = require('crypto');
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
     */
    static async getUserPlanners(userId, filters = {}) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { rows: planners, count: total } = await Planner.findAndCountAll({
                where: { user_id: userId },
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

            // Check ownership only if userId is provided (owner access)
            if (userId && planner.user_id !== userId) {
                throw new Error('Forbidden');
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
     * Update planner status only
     */
    static async updatePlannerStatus(plannerId, userId, status) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Validate status
            if (!['planning', 'ongoing', 'completed'].includes(status)) {
                throw new Error('Invalid status');
            }

            // Update only status
            await planner.update({ status });

            Logger.info(`Planner status updated by user ${userId}: ${plannerId} -> ${status}`);
            return this.formatPlannerResponse(planner);
        } catch (error) {
            Logger.error('Update planner status error:', error);
            throw error;
        }
    }

    /**
     * Delete planner
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

            await planner.destroy();

            Logger.info(`Planner deleted by user ${userId}: ${plannerId}`);
            return { id: plannerId, message: 'Planner deleted successfully' };
        } catch (error) {
            Logger.error('Delete planner error:', error);
            throw error;
        }
    }

    /**
     * Add item to planner with distance validation
     * userId is optional - if not provided, skips ownership check (for token access)
     */
    static async addPlannerItem(plannerId, userId = null, itemData) {
        const transaction = await sequelize.transaction();

        try {
            const { site_id, day_number, note, nearby_amenity_ids, estimated_time, rest_duration } = itemData;

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

            // If there's a previous site, get travel time from Vietmap
            if (previousItem && previousItem.site) {
                const prevSite = previousItem.site;

                // Check if both sites have coordinates
                if (prevSite.latitude && prevSite.longitude && site.latitude && site.longitude) {
                    // Map transportation to VietMap vehicle type
                    let vehicle = 'bike'; // default
                    if (planner.transportation) {
                        const lowerTransport = planner.transportation.toLowerCase();
                        if (lowerTransport.includes('car') || lowerTransport === 'car') {
                            vehicle = 'car';
                        } else if (lowerTransport.includes('bus')) {
                            vehicle = 'car'; // bus uses car routing
                        } else if (lowerTransport.includes('motorbike')) {
                            vehicle = 'bike';
                        }
                    }

                    // Get route info from Vietmap (only for travel time)
                    const routeInfo = await OSRMUtil.getRouteInfo(
                        { lat: parseFloat(prevSite.latitude), lng: parseFloat(prevSite.longitude) },
                        { lat: parseFloat(site.latitude), lng: parseFloat(site.longitude) },
                        vehicle
                    );

                    if (routeInfo && routeInfo.duration) {
                        travelTimeMinutes = Math.ceil(routeInfo.duration / 60); // Convert seconds to minutes
                        Logger.info(`Travel time from previous site: ${travelTimeMinutes} minutes`);

                        // Validation 1: Travel time should not exceed 24 hours
                        if (travelTimeMinutes > 1440) { // 1440 minutes = 24 hours
                            throw new Error(`Travel time between sites is too long (${Math.floor(travelTimeMinutes / 60)} hours). Maximum allowed is 24 hours.`);
                        }
                    }
                }
            }

            // Auto-calculate estimated_time based on previous item
            // User can only set estimated_time for the FIRST item in a day
            let finalEstimatedTime;
            if (previousItem && previousItem.estimated_time) {
                // If there's a previous item, always auto-calculate (ignore user input)
                finalEstimatedTime = calculateEstimatedTime(previousItem, travelTimeMinutes, '09:00');
                Logger.info(`Auto-calculated estimated_time: ${finalEstimatedTime} (from ${previousItem.estimated_time} + ${parseDurationToMinutes(previousItem.rest_duration)}min rest + ${travelTimeMinutes}min travel)`);

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
            } else {
                // First item in the day: use user input or default
                finalEstimatedTime = estimated_time || '09:00';
                Logger.info(`Using ${estimated_time ? 'user-provided' : 'default'} estimated_time: ${finalEstimatedTime}`);
            }

            // Validation 3: Check if estimated_time falls within site's opening hours
            if (site.opening_hours && planner.start_date) {
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
                order_index: nextOrderIndex,
                note: note || null,
                nearby_amenity_ids: nearby_amenity_ids || [],
                estimated_time: finalEstimatedTime,
                rest_duration: rest_duration || null
            }, { transaction });

            await transaction.commit();

            // Fetch item with site details
            const result = await PlannerItem.findByPk(item.id, {
                include: [
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                ]
            });

            Logger.info(`Item added to planner ${plannerId} by user ${userId}`);

            return this.formatPlannerItemResponse(result);
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

            // Update order_index for each item
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
            for (let i = 1; i < itemsWithSites.length; i++) {
                const currentItem = itemsWithSites[i];
                const previousItem = itemsWithSites[i - 1];

                let travelTimeMinutes = 0;

                // Get travel time from VietMap
                if (previousItem.site && currentItem.site &&
                    previousItem.site.latitude && previousItem.site.longitude &&
                    currentItem.site.latitude && currentItem.site.longitude) {

                    // Map transportation to VietMap vehicle type
                    let vehicle = 'bike';
                    if (planner.transportation) {
                        const lowerTransport = planner.transportation.toLowerCase();
                        if (lowerTransport.includes('car') || lowerTransport === 'car') {
                            vehicle = 'car';
                        } else if (lowerTransport.includes('bus')) {
                            vehicle = 'car';
                        } else if (lowerTransport.includes('motorbike')) {
                            vehicle = 'bike';
                        }
                    }

                    const routeInfo = await OSRMUtil.getRouteInfo(
                        { lat: parseFloat(previousItem.site.latitude), lng: parseFloat(previousItem.site.longitude) },
                        { lat: parseFloat(currentItem.site.latitude), lng: parseFloat(currentItem.site.longitude) },
                        vehicle
                    );

                    if (routeInfo && routeInfo.duration) {
                        travelTimeMinutes = Math.ceil(routeInfo.duration / 60);
                    }
                }

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
            share_role: planner.share_role,
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
            day_number: item.day_number,
            order_index: item.order_index,
            note: item.note,
            nearby_amenity_ids: item.nearby_amenity_ids || [],
            estimated_time: item.estimated_time,
            rest_duration: item.rest_duration,
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
     * Create or update share token with role
     */
    static async createShareToken(plannerId, userId, role = 'viewer') {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Validate role
            if (!['viewer', 'editor'].includes(role)) {
                throw new Error('Invalid role');
            }

            // Generate token if not exists
            if (!planner.share_token) {
                planner.share_token = crypto.randomBytes(24).toString('hex');
            }

            planner.share_role = role;

            await planner.save();

            Logger.info(`Share token created/updated for planner ${plannerId} by user ${userId} with role ${role}`);

            return {
                token: planner.share_token,
                role: planner.share_role,
                link: `myapp://planners/share/${planner.share_token}`
            };
        } catch (error) {
            Logger.error('Create share token error:', error);
            throw error;
        }
    }

    /**
     * Disable sharing
     */
    static async disableShare(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check ownership
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            planner.share_token = null;
            planner.share_role = null;

            await planner.save();

            Logger.info(`Sharing disabled for planner ${plannerId} by user ${userId}`);

            return { message: 'Sharing disabled successfully' };
        } catch (error) {
            Logger.error('Disable share error:', error);
            throw error;
        }
    }
}

module.exports = PlannerService;
