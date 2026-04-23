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
 * Dọn dẹp giao dịch pending quá hạn (PayOS link đã expired)
 * Chạy mỗi 15 phút
 * 
 * An toàn: Luôn kiểm tra trạng thái thật trên PayOS trước khi cancel.
 * Dùng conditional update (WHERE status = 'pending') để tránh race với webhook.
 */
const cleanupExpiredPayments = async () => {
    try {
        const { Transaction } = require('../models');
        const { Op } = require('sequelize');
        const PayOSService = require('../services/shared/payosService');

        // Chỉ quét giao dịch pending > 20 phút (buffer cho webhook delay)
        const expiryThreshold = new Date(Date.now() - 20 * 60 * 1000);

        const staleTransactions = await Transaction.findAll({
            where: {
                status: 'pending',
                type: { [Op.in]: ['topup', 'escrow_lock'] },
                reference_type: { [Op.in]: ['wallet_topup', 'planner_deposit'] },
                created_at: { [Op.lt]: expiryThreshold }
            }
        });

        if (staleTransactions.length === 0) return;

        let cancelledCount = 0;
        let skippedCount = 0;

        for (const tx of staleTransactions) {
            try {
                // Trích orderCode từ reference_id
                const parts = tx.reference_id.split(':');
                const orderCode = parts[parts.length - 1];

                if (!orderCode || orderCode === 'wallet') {
                    // Wallet-based payment, không có PayOS link → cancel trực tiếp (guarded)
                    const [updated] = await Transaction.update(
                        { status: 'cancelled', description: `${tx.description} | Tự động hủy — quá hạn thanh toán` },
                        { where: { id: tx.id, status: 'pending' } }
                    );
                    if (updated > 0) cancelledCount++;
                    continue;
                }

                // Kiểm tra trạng thái thật trên PayOS
                let payosStatus;
                try {
                    const paymentInfo = await PayOSService.getPaymentInfo(orderCode);
                    payosStatus = paymentInfo?.status;
                } catch (e) {
                    Logger.warn(`Cleanup: Cannot check PayOS status for orderCode=${orderCode}: ${e.message}`);
                    skippedCount++;
                    continue; // Không chắc → bỏ qua, chờ lần sau
                }

                // Chỉ cancel nếu PayOS xác nhận đã hết hạn hoặc bị hủy
                if (['EXPIRED', 'CANCELLED'].includes(payosStatus)) {
                    const [updated] = await Transaction.update(
                        { status: 'cancelled', description: `${tx.description} | Tự động hủy — PayOS ${payosStatus}` },
                        { where: { id: tx.id, status: 'pending' } }
                    );
                    if (updated > 0) cancelledCount++;
                } else if (payosStatus === 'PAID') {
                    // PayOS đã nhận tiền nhưng webhook chưa xử lý → để webhook handler lo
                    Logger.warn(`Cleanup: Transaction ${tx.id} is PAID on PayOS but still pending in DB — skipping, webhook should handle`);
                    skippedCount++;
                } else {
                    skippedCount++;
                }
            } catch (txError) {
                Logger.warn(`Cleanup: Error processing transaction ${tx.id}: ${txError.message}`);
                skippedCount++;
            }
        }

        if (cancelledCount > 0 || skippedCount > 0) {
            Logger.info(`Payment cleanup: cancelled=${cancelledCount}, skipped=${skippedCount}`);
        }
    } catch (error) {
        Logger.error('Cleanup expired payments error:', error);
    }
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

    // 4. Dọn dẹp giao dịch PayOS pending quá hạn (Mỗi 15 phút)
    cron.schedule('*/15 * * * *', async () => {
        try {
            await cleanupExpiredPayments();
        } catch (error) {
            Logger.error('Cleanup expired payments cron job error:', error);
        }
    }, TZ_OPTIONS);

    Logger.info(`Cron jobs scheduled (tz=${appConfig.timezone}): start=15m, complete=24h, eventSync=24h, paymentCleanup=15m`);
};

module.exports = {
    startCronJobs,
    autoCompletePlanners,
    cleanupExpiredPayments
};
