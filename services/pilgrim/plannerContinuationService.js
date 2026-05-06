const { Planner, PlannerItem, PlannerMember, PlannerMessage, UserCheckin, User, sequelize } = require('../../models');
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
            const oldPlanner = await Planner.findByPk(oldPlannerId, { 
                transaction: t,
                lock: true // Prevent multiple users from creating continuations simultaneously
            });
            if (!oldPlanner) {
                throw new Error('Planner not found');
            }

            if (oldPlanner.status !== 'cancelled') {
                throw new Error('Continuation is only available for cancelled planners');
            }

            // Check if the original planner's end_date has passed
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = new Date(oldPlanner.end_date);
            endDate.setHours(23, 59, 59, 999); // Allow until end of the last day
            if (today > endDate) {
                throw new Error('Continuation is no longer available because the original journey period has ended');
            }

            // 2. Ensure user was a member of the old planner

            const oldMember = await PlannerMember.findOne({
                where: { planner_id: oldPlannerId, user_id: userId },
                transaction: t
            });

            if (!oldMember || oldMember.join_status !== 'joined') {
                throw new Error('Only active members of the original planner can continue');
            }

            // 3. Check if continuation already exists
            let continuation = await Planner.findOne({
                where: { 
                    continuation_of_id: oldPlannerId,
                    status: { [Op.notIn]: ['cancelled', 'expired'] }
                },
                transaction: t,
                lock: true
            });

            if (continuation) {
                // JOIN EXISTING
                if (oldPlanner.user_id === userId) {
                    throw new Error('Original owner cannot join continuation');
                }
                // RULE: Cannot join if the continuation itself is already finished or cancelled
                if (['completed', 'cancelled', 'expired'].includes(continuation.status)) {
                    throw new Error('Continuation journey is no longer active');
                }

                Logger.info(`User ${userId} joined existing continuation planner ${continuation.id} for old planner ${oldPlannerId}`);
                
                if (continuation.user_id !== userId) {
                    // RULE: Cannot join if someone has already checked in at any site in the continuation
                    const checkInCount = await UserCheckin.count({
                        include: [{
                            model: PlannerItem,
                            as: 'plannerItem',
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
                return this._formatContinuationResponse(continuation, true);
            }

            // 4. CREATE NEW (First person to continue)
            if (oldPlanner.user_id === userId) {
                throw new Error('Original owner cannot create continuation');
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

            // Re-index days: reset leg_number to start from 1
            const minOldDay = Math.min(...remainingItems.map(i => i.leg_number));
            const maxOldDay = Math.max(...remainingItems.map(i => i.leg_number));

            // Calculate new start_date = old start_date + (minOldDay - 1) days
            // e.g. old start = May 1, emergency at Day 3 → new start = May 3
            const oldStart = new Date(oldPlanner.start_date);
            const newStart = new Date(oldStart);
            newStart.setDate(newStart.getDate() + (minOldDay - 1));
            const startStr = newStart.toISOString().split('T')[0];

            // Calculate new end_date based on remaining duration
            const durationDays = maxOldDay - minOldDay;
            const newEnd = new Date(newStart);
            newEnd.setDate(newEnd.getDate() + durationDays);
            const endStr = newEnd.toISOString().split('T')[0];

            // Generate default name if not provided
            const dateSuffix = new Date().toLocaleDateString('vi-VN', { 
                day: '2-digit', 
                month: '2-digit' 
            }).replace('/', ''); // "2504" for April 25
            
            const newPlannerName = continuationData.name || `${oldPlanner.name} (Tiếp nối ${dateSuffix})`;
            
            Logger.info(`User ${userId} creating new continuation planner for old planner ${oldPlannerId} with name: ${newPlannerName}`);

            continuation = await Planner.create({
                user_id: userId, // First person becomes new owner
                name: newPlannerName,
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

            // Clone items with reset leg_number (Day 3 → Day 1, Day 4 → Day 2, ...)
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

            await t.commit();

            // 5. NOTIFY MEMBERS (Async, out of transaction)
            try {
                const creator = await User.findByPk(userId, { attributes: ['full_name'] });
                const PlannerService = require('../plannerService');
                const PlannerChatService = require('./plannerChatService');

                // System message in the OLD planner's chat to notify everyone
                await PlannerChatService.sendSystemMessage(
                    oldPlannerId,
                    `Thành viên ${creator ? creator.full_name : 'một người'} đã khởi tạo hành trình tiếp nối. Các thành viên có thể nhấn vào nút "Tiếp nối hành trình" ở trên để tham gia.`
                );
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
            
            return this._formatContinuationResponse(continuation, false);
        } catch (error) {
            await t.rollback();
            Logger.error('Create continuation planner error:', error);
            throw error;
        }
    }

    static _formatContinuationResponse(planner, isJoined = false) {
        return {
            id: planner.id,
            name: planner.name,
            status: planner.status,
            continuation_of_id: planner.continuation_of_id,
            owner_id: planner.user_id,
            message_key: isJoined 
                ? 'planner.continuation_join_success'
                : 'planner.continuation_create_success'
        };
    }
}

module.exports = PlannerContinuationService;
