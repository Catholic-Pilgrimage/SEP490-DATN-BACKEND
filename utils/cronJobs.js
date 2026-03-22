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
    
    // Cron chạy lúc 00:01 mỗi ngày
    cron.schedule('1 0 * * *', async () => {
        try {
            Logger.info('Running daily planners cron jobs...');
            // 1. Tự động chuyển planner sang ongoing nếu đến ngày
            await PlannerService.autoStartPlanners();
            
            // 2. Tự động complete/expire planners nếu hết hạn
            await PlannerService.autoCompleteExpiredPlanners();
        } catch (error) {
            Logger.error('Daily planners cron job error:', error);
        }
    });

    Logger.info('Cron jobs scheduled successfully');
};

module.exports = {
    startCronJobs,
    autoCompletePlanners
};
