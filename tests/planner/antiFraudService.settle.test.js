const test = require('node:test');
const assert = require('node:assert/strict');

const { loadAntiFraudService } = require('./_antiFraudTestHelper');

function createPlanner(data = {}) {
    return {
        id: 'planner-id',
        user_id: 'owner-id',
        name: 'Test Pilgrimage',
        status: 'completed',
        start_date: '2026-04-08',
        end_date: '2026-04-10',
        deposit_amount: 200000,
        penalty_percentage: 20,
        ...data,
    };
}

function createMember(data = {}) {
    return {
        user_id: 'member-1',
        planner_id: 'planner-id',
        join_status: 'joined',
        deposit_status: 'paid',
        ...data,
    };
}

// ===== Case 1: Member checked-in → full refund, no penalty =====
test('UTCID01: settle refunds 100% for member who checked in', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner(),
        plannerMemberFindAll: async () => [createMember({ user_id: 'member-1' })],
        userCheckinFindAll: async () => [
            { user_id: 'member-1', is_valid: true, checkin_date: new Date('2026-04-09T10:00:00Z') },
        ],
        walletFindOne: async () => ({
            id: 'owner-wallet',
            user_id: 'owner-id',
            balance: 0,
            save: async () => { },
        }),
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'verified');
    assert.equal(result.checked_in_count, 1);
    assert.equal(state.walletApplyPenaltyCalls.length, 0);
    assert.equal(state.plannerMemberUpdateCalls.length, 1);
    assert.equal(state.plannerMemberUpdateCalls[0].values.deposit_status, 'refunded');
    assert.equal(state.plannerMemberUpdateCalls[0].values.join_status, undefined);
});

// ===== Case 2: Member no-show + penalty > 0 → penalized =====
test('UTCID02: settle applies penalty for no-show member with penalty_percentage > 0', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner({ penalty_percentage: 20 }),
        plannerMemberFindAll: async () => [
            createMember({ user_id: 'member-checkin' }),
            createMember({ user_id: 'member-noshow' }),
        ],
        userCheckinFindAll: async () => [
            { user_id: 'member-checkin', is_valid: true, checkin_date: new Date('2026-04-09T08:00:00Z') },
        ],
        walletFindOne: async () => ({
            id: 'owner-wallet',
            user_id: 'owner-id',
            balance: 0,
            save: async () => { },
        }),
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'verified');
    assert.equal(result.checked_in_count, 1);

    const refundUpdate = state.plannerMemberUpdateCalls.find(
        c => c.options.where.user_id === 'member-checkin'
    );
    assert.equal(refundUpdate.values.deposit_status, 'refunded');
    assert.equal(refundUpdate.values.join_status, undefined);

    const penaltyUpdate = state.plannerMemberUpdateCalls.find(
        c => c.options.where.user_id === 'member-noshow'
    );
    assert.equal(penaltyUpdate.values.deposit_status, 'penalized');
    assert.equal(penaltyUpdate.values.join_status, 'dropped_out');

    assert.equal(state.walletApplyPenaltyCalls.length, 1);
    assert.equal(state.walletApplyPenaltyCalls[0].memberUserId, 'member-noshow');
    assert.equal(state.walletApplyPenaltyCalls[0].penaltyPercentage, 20);
    assert.equal(state.walletApplyPenaltyCalls[0].depositAmount, 200000);
});

// ===== Case 3: Member no-show + penalty = 0 → refund but mark dropped_out =====
test('UTCID03: settle refunds no-show member and marks dropped_out when penalty is 0', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner({ penalty_percentage: 0 }),
        plannerMemberFindAll: async () => [
            createMember({ user_id: 'member-checkin' }),
            createMember({ user_id: 'member-noshow' }),
        ],
        userCheckinFindAll: async () => [
            { user_id: 'member-checkin', is_valid: true, checkin_date: new Date('2026-04-09T08:00:00Z') },
        ],
        walletFindOne: async () => ({
            id: 'owner-wallet',
            user_id: 'owner-id',
            balance: 0,
            save: async () => { },
        }),
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'verified');
    assert.equal(state.walletApplyPenaltyCalls.length, 0);

    const noshowUpdate = state.plannerMemberUpdateCalls.find(
        c => c.options.where.user_id === 'member-noshow'
    );
    assert.equal(noshowUpdate.values.deposit_status, 'refunded');
    assert.equal(noshowUpdate.values.join_status, 'dropped_out');
});

// ===== Case 4: Zero check-ins globally → suspicious, all refunded =====
test('UTCID04: settle returns suspicious and refunds all when no one checked in', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner(),
        plannerMemberFindAll: async () => [createMember({ user_id: 'member-1' })],
        userCheckinFindAll: async () => [],
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'suspicious');
    assert.equal(result.checked_in_count, 0);
    assert.equal(state.walletApplyPenaltyCalls.length, 0);
    assert.equal(state.plannerMemberUpdateCalls[0].values.deposit_status, 'refunded');
});

// ===== Case 5: Members already dropped_out/kicked are skipped =====
test('UTCID05: settle skips members who already left or were kicked', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner(),
        plannerMemberFindAll: async () => [
            createMember({ user_id: 'member-dropped', join_status: 'dropped_out', deposit_status: 'penalized' }),
            createMember({ user_id: 'member-kicked', join_status: 'kicked', deposit_status: 'refunded' }),
        ],
        userCheckinFindAll: async () => [
            { user_id: 'owner-id', is_valid: true, checkin_date: new Date('2026-04-09T10:00:00Z') },
        ],
        walletFindOne: async () => ({
            id: 'owner-wallet',
            user_id: 'owner-id',
            balance: 0,
            save: async () => { },
        }),
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'verified');
    assert.equal(state.plannerMemberUpdateCalls.length, 0);
    assert.equal(state.walletApplyPenaltyCalls.length, 0);
});

// ===== Case 6: All valid check-ins counted regardless of timestamp (no date filter) =====
test('UTCID06: settle counts all valid check-ins scoped by planner_id (no date filter)', async () => {
    const { AntiFraudService, state } = loadAntiFraudService({
        plannerFindByPk: async () => createPlanner({
            start_date: '2026-04-08',
            end_date: '2026-04-10',
        }),
        plannerMemberFindAll: async () => [
            createMember({ user_id: 'member-late' }),
            createMember({ user_id: 'member-next-day' }),
        ],
        // Both check-ins are valid and scoped by PlannerItem join, no date filtering
        userCheckinFindAll: async () => [
            { user_id: 'member-late', is_valid: true, checkin_date: new Date('2026-04-10T16:00:00.000Z') },
            { user_id: 'member-next-day', is_valid: true, checkin_date: new Date('2026-04-10T17:30:00.000Z') },
        ],
        walletFindOne: async () => ({
            id: 'owner-wallet',
            user_id: 'owner-id',
            balance: 0,
            save: async () => { },
        }),
    });

    const result = await AntiFraudService.verifyAndSettlePlanner('planner-id');

    assert.equal(result.status, 'verified');
    assert.equal(result.checked_in_count, 2);

    // Both members checked in → both refunded, no penalty
    assert.equal(state.walletApplyPenaltyCalls.length, 0);
    assert.equal(state.plannerMemberUpdateCalls.length, 2);

    for (const call of state.plannerMemberUpdateCalls) {
        assert.equal(call.values.deposit_status, 'refunded');
        assert.equal(call.values.join_status, undefined);
    }
});
