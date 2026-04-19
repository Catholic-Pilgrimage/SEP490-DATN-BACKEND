/**
 * Utility functions for time calculations in planner items
 */

/**
 * Parse rest duration string to minutes
 * @param {string|Object} duration - Duration string like "1 hour", "30 minutes", "2 hours", "HH:MM:SS", or PostgreSQL INTERVAL object
 * @returns {number} - Duration in minutes
 */
function parseDurationToMinutes(duration) {
    if (!duration) return 0;

    // Handle PostgreSQL INTERVAL object (e.g., { hours: 2, minutes: 30 })
    if (typeof duration === 'object') {
        const hours = duration.hours || 0;
        const minutes = duration.minutes || 0;
        return (hours * 60) + minutes;
    }

    // Handle string format
    if (typeof duration !== 'string') {
        return 0;
    }

    // Handle PostgreSQL TIME format (HH:MM:SS or HH:MM)
    const timeMatch = duration.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        return (hours * 60) + minutes;
    }

    // Handle text format like "2 hours", "30 minutes"
    const textMatch = duration.match(/^(\d+)\s+(hour|hours|minute|minutes|min|mins)$/i);
    if (!textMatch) return 0;

    const value = parseInt(textMatch[1]);
    const unit = textMatch[2].toLowerCase();

    if (unit.startsWith('hour')) {
        return value * 60;
    } else {
        return value;
    }
}

/**
 * Add minutes to a time string
 * @param {string} timeStr - Time string in HH:MM format
 * @param {number} minutes - Minutes to add
 * @returns {string} - New time in HH:MM format
 */
function addMinutesToTime(timeStr, minutes) {
    if (!timeStr) return null;

    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;

    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;

    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Calculate estimated time for a new planner item
 * @param {Object} previousItem - Previous planner item with estimated_time and rest_duration
 * @param {number} travelTimeMinutes - Travel time in minutes from OSRM
 * @param {string} defaultStartTime - Default start time if no previous item (e.g., '08:00')
 * @returns {string} - Estimated time in HH:MM format
 */
function calculateEstimatedTime(previousItem, travelTimeMinutes = 0, defaultStartTime = '08:00') {
    // If no previous item, use default start time
    if (!previousItem || !previousItem.estimated_time) {
        return defaultStartTime;
    }

    // Calculate departure time from previous location
    const restMinutes = parseDurationToMinutes(previousItem.rest_duration);
    const departureTime = addMinutesToTime(previousItem.estimated_time, restMinutes);

    // Add travel time to get arrival time at new location
    return addMinutesToTime(departureTime, travelTimeMinutes);
}

/**
 * Check if a time falls within site's opening hours for a specific day
 * @param {string} time - Time in HH:MM format (e.g., "09:00")
 * @param {Object} openingHours - Opening hours object { "monday": "05:00-18:00", ... }
 * @param {Date} date - Date object to determine day of week
 * @returns {Object} - { isOpen: boolean, message: string }
 */
function isWithinOpeningHours(time, openingHours, date) {
    if (!openingHours) {
        // No opening hours specified, assume always open
        return { isOpen: true };
    }

    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    let hoursForDay;

    if (typeof openingHours === 'string') {
        hoursForDay = openingHours;
    } else if (typeof openingHours === 'object') {
        if (openingHours.open && openingHours.close) {
            hoursForDay = `${openingHours.open}-${openingHours.close}`;
        } else {
            hoursForDay = openingHours[dayName];
            if (!hoursForDay) {
                return {
                    isOpen: false,
                    message: `Site is closed on ${dayName}s`
                };
            }
        }
    } else {
        return { isOpen: true };
    }

    // Parse opening hours (format: "HH:MM-HH:MM" or "HH:MM - HH:MM")
    const hoursMatch = hoursForDay.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!hoursMatch) {
        // Invalid format, assume always open
        return { isOpen: true };
    }

    const openHour = parseInt(hoursMatch[1]);
    const openMin = parseInt(hoursMatch[2]);
    const closeHour = parseInt(hoursMatch[3]);
    const closeMin = parseInt(hoursMatch[4]);

    // Parse input time
    const [inputHour, inputMin] = time.split(':').map(Number);

    // Convert to minutes for easier comparison
    const openTimeMinutes = openHour * 60 + openMin;
    const closeTimeMinutes = closeHour * 60 + closeMin;
    const inputTimeMinutes = inputHour * 60 + inputMin;

    // Check if time is within opening hours
    let isClosed = false;
    if (openTimeMinutes <= closeTimeMinutes) {
        // Normal case: 06:00 - 18:00
        if (inputTimeMinutes < openTimeMinutes || inputTimeMinutes > closeTimeMinutes) {
            isClosed = true;
        }
    } else {
        // Cross-midnight case: 22:00 - 04:00
        // It's closed if inputTime > closeTime and inputTime < openTime
        if (inputTimeMinutes > closeTimeMinutes && inputTimeMinutes < openTimeMinutes) {
            isClosed = true;
        }
    }

    if (isClosed) {
        return {
            isOpen: false,
            message: `Site is closed at ${time}. Opening hours: ${hoursForDay}`
        };
    }

    return { isOpen: true };
}

module.exports = {
    parseDurationToMinutes,
    addMinutesToTime,
    calculateEstimatedTime,
    isWithinOpeningHours
};
