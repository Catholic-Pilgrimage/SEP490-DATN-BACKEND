const cron = require('node-cron');
const PlannerService = require('../services/plannerService');
const { syncEventTimeStates } = require('./eventTimeState.util');
const appConfig = require('../config/app.config');
const Logger = require('./logger.util');

const TZ_OPTIONS = { scheduled: true, timezone: appConfig.timezone };

/**
 * Cron job để tự động hoàn thành các planner đã hết hạn
 * Chạy mỗi ngày lúc 00:01
 */
const autoCompletePlanners = () => {
    cron.schedule('1 0 * * *', async () => {
        try {
            Logger.info('Running auto-complete expired planners cron job...');
            const count = await PlannerService.autoCompleteExpiredPlanners();
            Logger.info(`Auto-completed ${count} expired planners`);
        } catch (error) {
            Logger.error('Auto-complete planners cron job error:', error);
        }
    }, TZ_OPTIONS);
};

/**
 * Khởi động tất cả cron jobs
 */
const startCronJobs = () => {
    Logger.info('Starting cron jobs...');

    // 1. Tự động chuyển planner sang ongoing theo thời gian (Check mỗi 15 phút)
    cron.schedule('*/15 * * * *', async () => {
        try {
            Logger.info('Running auto-start planners cron job...');
            await PlannerService.autoStartPlanners();
        } catch (error) {
            Logger.error('Auto-start planners cron job error:', error);
        }
    }, TZ_OPTIONS);

    // 2. Tự động complete/expire planners nếu hết hạn (Chạy lúc 00:01 mỗi ngày)
    cron.schedule('1 0 * * *', async () => {
        try {
            Logger.info('Running daily auto-complete planners cron job...');
            await PlannerService.autoCompleteExpiredPlanners();
        } catch (error) {
            Logger.error('Daily auto-complete planners cron job error:', error);
        }
    }, TZ_OPTIONS);

    // 3. Sync event time_state (Chạy lúc 00:01 mỗi ngày, cùng timezone app)
    cron.schedule('1 0 * * *', async () => {
        try {
            Logger.info('Running daily event time_state sync cron job...');
            await syncEventTimeStates();
        } catch (error) {
            Logger.error('Event time_state sync cron job error:', error);
        }
    }, TZ_OPTIONS);

    Logger.info(`Cron jobs scheduled (tz=${appConfig.timezone}): start=15m, complete=24h, eventSync=24h`);
};

module.exports = {
    startCronJobs,
    autoCompletePlanners
};

