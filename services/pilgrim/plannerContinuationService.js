const { Planner, PlannerItem, PlannerMember, PlannerMessage, CheckIn, sequelize } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

class PlannerContinuationService {
    /**
     * Create or join a continuation planner after an emergency stop
     * @param {string} oldPlannerId - The original planner ID
     * @param {string} userId - The user initiating/joining
     * @param {Object} continuationData - Optional custom data (name, etc.)
     */
    static async createOrJoinContinuation(oldPlannerId, userId, continuationData = {}) {
        const t = await sequelize.transaction();
        try {
            // 1. Validate old planner
            const oldPlanner = await Planner.findByPk(oldPlannerId, { transaction: t });
            if (!oldPlanner) {
                throw new Error('Planner not found');
            }

            if (oldPlanner.status !== 'cancelled') {
                throw new Error('Continuation is only available for cancelled planners');
            }

            // 2. Ensure user was a member or owner of the old planner
            const oldMember = await PlannerMember.findOne({
                where: { planner_id: oldPlannerId, user_id: userId },
                transaction: t
            });

            if (oldPlanner.user_id !== userId && (!oldMember || oldMember.join_status !== 'joined')) {
                throw new Error('Only active members of the original planner can continue');
            }

            // 3. Check if continuation already exists
            let continuation = await Planner.findOne({
                where: { continuation_of_id: oldPlannerId },
                transaction: t,
                lock: true
            });

            if (continuation) {
                // JOIN EXISTING
                // RULE: Cannot join if the continuation itself is already finished or cancelled
                if (['completed', 'cancelled', 'expired'].includes(continuation.status)) {
                    throw new Error('Continuation journey is no longer active');
                }

                if (continuation.user_id !== userId) {
                    // RULE: Cannot join if someone has already checked in at any site in the continuation
                    const checkInCount = await CheckIn.count({
                        include: [{
                            model: PlannerItem,
                            where: { planner_id: continuation.id },
                            required: true
                        }],
                        transaction: t
                    });

                    if (checkInCount > 0) {
                        throw new Error('Continuation journey already started');
                    }

                    await PlannerMember.findOrCreate({
                        where: { planner_id: continuation.id, user_id: userId },
                        defaults: { 
                            join_status: 'joined', 
                            deposit_status: 'paid', // Zero deposit, so marked as paid
                            joined_at: new Date()
                        },
                        transaction: t
                    });
                }
                
                await t.commit();
                return this._formatContinuationResponse(continuation);
            }

            // 4. CREATE NEW (First person to continue)
            // RULE: The original owner cannot be the one to initiate the continuation.
            if (oldPlanner.user_id === userId) {
                throw new Error('Original owner cannot initiate continuation');
            }

            // Get remaining items (those skipped due to emergency stop)
            const remainingItems = await PlannerItem.findAll({
                where: {
                    planner_id: oldPlannerId,
                    skip_reason: { [Op.like]: 'Emergency stop:%' }
                },
                order: [
                    ['leg_number', 'ASC'],
                    ['estimated_time', 'ASC'],
                    ['order_index', 'ASC']
                ],
                transaction: t
            });

            if (remainingItems.length === 0) {
                throw new Error('No remaining items to continue');
            }

            // Re-indexing days
            const minOldDay = Math.min(...remainingItems.map(i => i.leg_number));
            
            // Calculate start_date for the new planner (today)
            const today = new Date();
            const startStr = today.toISOString().split('T')[0];

            // Estimate new end_date based on duration
            const maxOldDay = Math.max(...remainingItems.map(i => i.leg_number));
            const durationDays = maxOldDay - minOldDay;
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + durationDays);
            const endStr = endDate.toISOString().split('T')[0];

            continuation = await Planner.create({
                user_id: userId, // First person becomes new owner
                name: (continuationData.name || `[Tiếp nối] ${oldPlanner.name}`).trim(),
                start_date: startStr,
                end_date: endStr,
                transportation: oldPlanner.transportation,
                deposit_amount: null,
                penalty_percentage: null,
                status: 'ongoing',
                continuation_of_id: oldPlannerId,
                is_active: true,
                is_locked: false,
                started_at: new Date(),
                min_people_required: 1,
                number_of_people: oldPlanner.number_of_people
            }, { transaction: t });

            // Clone items
            for (const item of remainingItems) {
                await PlannerItem.create({
                    planner_id: continuation.id,
                    site_id: item.site_id,
                    leg_number: item.leg_number - minOldDay + 1, // Reset to Day 1, 2...
                    order_index: item.order_index,
                    event_id: item.event_id,
                    status: 'upcoming',
                    note: item.note,
                    estimated_time: item.estimated_time,
                    rest_duration: (function(inv) {
                        if (!inv) return null;
                        if (typeof inv === 'string') return inv;
                        const p = [];
                        if (inv.hours) p.push(`${inv.hours} hours`);
                        if (inv.minutes) p.push(`${inv.minutes} minutes`);
                        if (inv.seconds) p.push(`${inv.seconds} seconds`);
                        if (inv.days) p.push(`${inv.days} days`);
                        return p.length > 0 ? p.join(' ') : '0 minutes';
                    })(item.rest_duration),
                    travel_time_minutes: item.travel_time_minutes
                }, { transaction: t });
            }

            // Add owner as a member record (consistency)
            await PlannerMember.create({
                planner_id: continuation.id,
                user_id: userId,
                join_status: 'joined',
                deposit_status: 'paid',
                joined_at: new Date()
            }, { transaction: t });

            // System message in the OLD planner's chat to notify everyone
            await PlannerMessage.create({
                planner_id: oldPlannerId,
                user_id: null, // System
                message_type: 'system',
                content: 'planner.continuation_created_system_msg' // FE or hooks should handle this, or we just put the text
            }, { transaction: t });

            await t.commit();

            // 5. NOTIFY MEMBERS (Async, out of transaction)
            try {
                const creator = await User.findByPk(userId, { attributes: ['full_name'] });
                const PlannerService = require('../plannerService');
                await PlannerService.notifyJoinedPlannerMembers(oldPlanner, 'planner_continuation_available', {
                    plannerId: continuation.id, // ID of the NEW planner
                    oldPlannerId: oldPlanner.id,
                    plannerName: oldPlanner.name,
                    creatorName: creator ? creator.full_name : 'Một thành viên'
                }, { excludeUserId: userId }); // Don't notify the person who just created it

                Logger.info(`Continuation created: ${continuation.id} for old planner ${oldPlannerId}`);
            } catch (notifyErr) {
                Logger.warn(`Failed to notify members about continuation: ${notifyErr.message}`);
            }
            
            return this._formatContinuationResponse(continuation);
        } catch (error) {
            await t.rollback();
            Logger.error('Create continuation planner error:', error);
            throw error;
        }
    }

    static _formatContinuationResponse(planner) {
        return {
            id: planner.id,
            name: planner.name,
            status: planner.status,
            continuation_of_id: planner.continuation_of_id,
            owner_id: planner.user_id,
            message: 'Đã sẵn sàng tiếp nối hành trình'
        };
    }
}

module.exports = PlannerContinuationService;
