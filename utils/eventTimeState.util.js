const appConfig = require('../config/app.config');
const Logger = require('./logger.util');

/**
 * Get today's date string (YYYY-MM-DD) in the application's configured timezone.
 * @param {string} [todayOverride] - Optional override for testing (YYYY-MM-DD)
 * @returns {string}
 */
function getToday(todayOverride) {
    if (todayOverride) return todayOverride;
    return new Date(
        new Date().toLocaleString('en-US', { timeZone: appConfig.timezone })
    ).toISOString().split('T')[0];
}

/**
 * Calculate the time_state for a single event.
 *
 * Rule (single formula):
 *   effective_end = end_date || start_date   (null end_date → 1-day event)
 *   upcoming  : today < start_date
 *   ongoing   : start_date <= today <= effective_end
 *   ended     : today > effective_end
 *
 * @param {string} startDate  - YYYY-MM-DD (required)
 * @param {string|null} endDate - YYYY-MM-DD or null
 * @param {string} [todayOverride] - Optional YYYY-MM-DD for deterministic tests
 * @returns {'upcoming'|'ongoing'|'ended'}
 */
function calculateEventTimeState(startDate, endDate, todayOverride) {
    const today = getToday(todayOverride);
    const effectiveEnd = endDate || startDate;

    if (today < startDate) return 'upcoming';
    if (today > effectiveEnd) return 'ended';
    return 'ongoing';
}

/**
 * Bulk-sync time_state for ALL events whose current value is out-of-date.
 * Shared by both the nightly cron job and the backfill script.
 *
 * @param {string} [todayOverride] - Optional YYYY-MM-DD for deterministic tests
 * @returns {Promise<{upcoming: number, ongoing: number, ended: number}>} counts updated
 */
async function syncEventTimeStates(todayOverride) {
    const { Event } = require('../models');
    const { Op } = require('sequelize');
    const today = getToday(todayOverride);

    // 1. upcoming → start_date > today (event hasn't started)
    const [upcomingCount] = await Event.update(
        { time_state: 'upcoming' },
        {
            where: {
                time_state: { [Op.ne]: 'upcoming' },
                start_date: { [Op.gt]: today }
            }
        }
    );

    // 2. ended → effective_end < today
    //    COALESCE(end_date, start_date) < today
    const sequelize = require('../config/database');
    const [endedCount] = await Event.update(
        { time_state: 'ended' },
        {
            where: {
                time_state: { [Op.ne]: 'ended' },
                [Op.and]: sequelize.literal(
                    `COALESCE("end_date", "start_date") < '${today}'`
                )
            }
        }
    );

    // 3. ongoing → start_date <= today AND effective_end >= today
    const [ongoingCount] = await Event.update(
        { time_state: 'ongoing' },
        {
            where: {
                time_state: { [Op.ne]: 'ongoing' },
                start_date: { [Op.lte]: today },
                [Op.and]: sequelize.literal(
                    `COALESCE("end_date", "start_date") >= '${today}'`
                )
            }
        }
    );

    Logger.info(`[syncEventTimeStates] Synced for today=${today}: upcoming=${upcomingCount}, ongoing=${ongoingCount}, ended=${endedCount}`);

    return { upcoming: upcomingCount, ongoing: ongoingCount, ended: endedCount };
}

module.exports = {
    calculateEventTimeState,
    syncEventTimeStates,
    getToday
};
