const cron = require('node-cron');
const PlannerService = require('../services/plannerService');
const Logger = require('./logger.util');

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
    });
};

/**
 * Khởi động tất cả cron jobs
 */
const startCronJobs = () => {
    Logger.info('Starting cron jobs...');
    autoCompletePlanners();
    Logger.info('Cron jobs started successfully');
};

module.exports = {
    startCronJobs,
    autoCompletePlanners
};
