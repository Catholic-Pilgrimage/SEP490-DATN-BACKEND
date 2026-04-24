const { Planner, PlannerItem } = require('../../models');
const { sequelize } = require('../../models');
const Logger = require('../../utils/logger.util');

class PlannerEmergencyService {
    /**
     * Emergency stop an ongoing planner
     * - Only the owner can trigger
     * - Planner must be in 'ongoing' status
     * - All 'upcoming' items are marked as 'skipped'
     * - Planner status changes to 'cancelled'
     * - Settlement is triggered (refund/penalty)
     * - Notifications sent to all joined members
     */
    static async emergencyStopPlanner(plannerId, userId, reason) {
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

            const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
            if (!normalizedReason) {
                throw new Error('Emergency reason is required');
            }

            const emergencySkipReason = `Emergency stop: ${normalizedReason}`;
            await PlannerItem.update({
                status: 'skipped',
                skip_reason: emergencySkipReason,
                skipped_at: new Date()
            }, {
                where: {
                    planner_id: plannerId,
                    status: 'upcoming'
                },
                transaction: t
            });

            await planner.update({
                status: 'cancelled',
                cancelled_reason: normalizedReason,
                is_locked: false
            }, { transaction: t });

            const PlannerAntiFraudService = require('./plannerAntiFraudService');
            await PlannerAntiFraudService.verifyAndSettlePlanner(plannerId, t);

            await t.commit();

            // Notify after commit (lazy require to avoid circular deps)
            const PlannerService = require('../plannerService');
            const PlannerChatService = require('./plannerChatService');
            
            await PlannerService.notifyJoinedPlannerMembers(planner, 'planner_emergency_stopped', {
                plannerId: planner.id,
                plannerName: planner.name || 'Planner',
                reason: normalizedReason
            });

            // Send system message explaining continuation option
            await PlannerChatService.sendSystemMessage(
                plannerId,
                'Hành trình đã bị dừng khẩn cấp. Các thành viên có thể chọn "Tiếp nối hành trình" để tiếp tục phần lịch trình còn lại với một kế hoạch mới (không yêu cầu tiền cọc).'
            );

            Logger.info(`Planner ${plannerId} emergency-stopped by user ${userId}`);
            return PlannerService.formatPlannerResponse(planner);
        } catch (error) {
            await t.rollback();
            Logger.error('Emergency stop planner error:', error);
            throw error;
        }
    }
}

module.exports = PlannerEmergencyService;
