const { Planner, PlannerItem, User, Site, PlannerMember } = require('../../models');
const Logger = require('../../utils/logger.util');
const { parseDurationToMinutes } = require('../../utils/timeCalculation.util');

class PlannerCalendarService {
    /**
     * Get planner data formatted for calendar sync (expo-calendar)
     * Returns events ready to be synced to device calendar
     */
    static async getPlannerForCalendarSync(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId, {
                include: [
                    { model: User, as: 'owner', attributes: ['id', 'full_name', 'email'] },
                    {
                        model: PlannerItem,
                        as: 'items',
                        include: [
                            { 
                                model: Site, 
                                as: 'site', 
                                attributes: ['id', 'name', 'code', 'province', 'address', 'latitude', 'longitude'] 
                            }
                        ],
                        order: [['leg_number', 'ASC'], ['order_index', 'ASC']]
                    }
                ]
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check access: owner or member
            if (planner.user_id !== userId) {
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

            // Validate planner has dates
            if (!planner.start_date || !planner.end_date) {
                throw new Error('Planner must have start_date and end_date for calendar sync');
            }

            // Format events for calendar
            const events = [];
            const plannerStartDate = new Date(planner.start_date);

            for (const item of planner.items) {
                // Calculate actual date for this item
                const itemDate = new Date(plannerStartDate);
                itemDate.setDate(plannerStartDate.getDate() + (item.leg_number - 1));
                const dateStr = itemDate.toISOString().split('T')[0]; // YYYY-MM-DD

                // Parse estimated_time (HH:mm)
                const [hours, minutes] = item.estimated_time ? item.estimated_time.split(':').map(Number) : [9, 0];
                
                // Create start datetime (ISO 8601)
                const startDate = new Date(itemDate);
                startDate.setHours(hours, minutes, 0, 0);

                // Calculate end time based on rest_duration
                const restMinutes = parseDurationToMinutes(item.rest_duration) || 60; // default 1 hour
                const endDate = new Date(startDate);
                endDate.setMinutes(endDate.getMinutes() + restMinutes);

                // Format title
                const title = `${planner.name} - ${item.site.name}`;

                // Format location
                const location = item.site.address || `${item.site.name}, ${item.site.province}`;

                // Format notes/description
                let notes = `📍 ${item.site.name}\n`;
                if (item.site.province) {
                    notes += `🗺️ ${item.site.province}\n`;
                }
                notes += `📅 Ngày ${item.leg_number} - Điểm ${item.order_index}\n`;
                if (item.note) {
                    notes += `📝 ${item.note}\n`;
                }
                notes += `⏱️ Thời gian nghỉ: ${item.rest_duration}`;

                // Add coordinates if available
                const coordinates = (item.site.latitude && item.site.longitude) ? {
                    latitude: parseFloat(item.site.latitude),
                    longitude: parseFloat(item.site.longitude)
                } : null;

                events.push({
                    id: item.id,
                    title: title,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    location: location,
                    notes: notes,
                    alarms: [
                        { relativeOffset: -30 }, // 30 minutes before
                        { relativeOffset: -60 }  // 1 hour before
                    ],
                    timeZone: 'Asia/Ho_Chi_Minh',
                    // Additional metadata for mobile app
                    metadata: {
                        planner_id: planner.id,
                        planner_item_id: item.id,
                        site_id: item.site_id,
                        site_code: item.site.code,
                        leg_number: item.leg_number,
                        order_index: item.order_index,
                        coordinates: coordinates
                    }
                });
            }

            Logger.info(`Calendar sync data prepared for planner ${plannerId} by user ${userId}: ${events.length} events`);

            return {
                planner: {
                    id: planner.id,
                    name: planner.name,
                    start_date: planner.start_date,
                    end_date: planner.end_date,
                    number_of_people: planner.number_of_people,
                    transportation: planner.transportation,
                    owner: planner.owner ? {
                        id: planner.owner.id,
                        full_name: planner.owner.full_name,
                        email: planner.owner.email
                    } : null
                },
                events: events,
                total_events: events.length,
                sync_instructions: {
                    timezone: 'Asia/Ho_Chi_Minh',
                    alarm_offsets: [-30, -60], // minutes before event
                    recommended_calendar_name: `Hành Hương - ${planner.name}`
                }
            };
        } catch (error) {
            Logger.error('Get planner for calendar sync error:', error);
            throw error;
        }
    }
}

module.exports = PlannerCalendarService;
