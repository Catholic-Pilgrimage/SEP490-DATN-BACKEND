const { PlannerMember } = require('../models');

/**
 * Central helper to check planner access for a user.
 * Returns { can_view, is_read_only, viewer_join_status, viewer_deposit_status }
 *
 * Rules:
 *   Owner                                          → can_view=true,  is_read_only=false
 *   join_status='joined'                           → can_view=true,  is_read_only=false
 *   join_status='dropped_out' + deposit paid/penalized → can_view=true,  is_read_only=true
 *   Everything else (kicked, no deposit, etc.)     → can_view=false
 */
async function checkPlannerAccess(plannerId, userId, ownerId) {
    // Owner always has full access
    if (userId === ownerId) {
        return {
            can_view: true,
            is_read_only: false,
            viewer_join_status: 'owner',
            viewer_deposit_status: null
        };
    }

    const member = await PlannerMember.findOne({
        where: {
            planner_id: plannerId,
            user_id: userId
        }
    });

    if (!member) {
        return {
            can_view: false,
            is_read_only: true,
            viewer_join_status: null,
            viewer_deposit_status: null
        };
    }

    // Active member
    if (member.join_status === 'joined') {
        return {
            can_view: true,
            is_read_only: false,
            viewer_join_status: 'joined',
            viewer_deposit_status: member.deposit_status || null
        };
    }

    // Dropped out with financial involvement → read-only
    if (
        member.join_status === 'dropped_out' &&
        ['refunded', 'penalized'].includes(member.deposit_status)
    ) {
        return {
            can_view: true,
            is_read_only: true,
            viewer_join_status: 'dropped_out',
            viewer_deposit_status: member.deposit_status
        };
    }

    // Everything else (kicked, dropped_out without deposit, etc.) → no access
    return {
        can_view: false,
        is_read_only: true,
        viewer_join_status: member.join_status,
        viewer_deposit_status: member.deposit_status || null
    };
}

module.exports = { checkPlannerAccess };
