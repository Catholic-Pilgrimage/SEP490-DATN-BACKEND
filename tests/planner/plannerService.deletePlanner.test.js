const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRecord(factory, data = {}) {
  return factory({
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    number_of_people: 4,
    transportation: 'bus',
    deposit_amount: 0,
    penalty_percentage: 0,
    status: 'planning',
    is_active: true,
    ...data,
  });
}

function createMember(data = {}, saveCalls) {
  return {
    planner_id: 'planner-id',
    user_id: 'member-id',
    join_status: 'joined',
    deposit_status: null,
    ...data,
    save: async (options) => {
      saveCalls.push({
        user_id: data.user_id || 'member-id',
        join_status: data.join_status || 'joined',
        deposit_status: data.deposit_status || null,
        options,
      });
      return data;
    },
  };
}

function createTransactionRow(data = {}, updateCalls) {
  return {
    reference_id: 'planner-id:user-2:987654',
    status: 'pending',
    update: async (values, options) => {
      updateCalls.push({ reference_id: data.reference_id || 'planner-id:user-2:987654', values, options });
      Object.assign(data, values);
      return data;
    },
    ...data,
  };
}

test('UTCID01: deletePlanner soft deletes planner and kicks joined members without refund flow', async () => {
  const memberSaveCalls = [];
  const joinedMember = createMember({ user_id: 'member-1' }, memberSaveCalls);

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerMemberFindAll: async () => [joinedMember],
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    joinWindowClosed: false,
  });

  const result = await PlannerService.deletePlanner('planner-id', 'owner-id');

  assert.equal(result.id, 'planner-id');
  assert.equal(result.members_refunded, 0);
  assert.equal(result.members_kicked, 1);
  assert.equal(result.refund_amount_each, undefined);
  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
  assert.deepEqual(state.plannerInstanceUpdateCalls[0].values, { is_active: false });
  assert.equal(memberSaveCalls.length, 1);
  assert.equal(state.walletRefundCalls.length, 0);
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
  assert.equal(state.notificationCreateCalls.length, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_kicked');
});

test('UTCID02: deletePlanner refunds paid members and cancels pending deposit transactions', async () => {
  const memberSaveCalls = [];
  const txUpdateCalls = [];
  const paidMember = createMember({ user_id: 'member-paid', deposit_status: 'paid' }, memberSaveCalls);
  const unpaidMember = createMember({ user_id: 'member-unpaid' }, memberSaveCalls);
  const walletTx = createTransactionRow({ reference_id: 'planner-id:member-paid:wallet' }, txUpdateCalls);
  const payosTx = createTransactionRow({ reference_id: 'planner-id:member-paid:987654' }, txUpdateCalls);

  let memberFindAllCallIndex = 0;

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      deposit_amount: 300000,
    }),
    plannerMemberFindAll: async () => {
      memberFindAllCallIndex += 1;
      return memberFindAllCallIndex === 1 ? [paidMember] : [unpaidMember];
    },
    transactionFindAll: async () => [walletTx, payosTx],
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    joinWindowClosed: false,
  });

  const result = await PlannerService.deletePlanner('planner-id', 'owner-id');

  assert.equal(result.members_refunded, 1);
  assert.equal(result.members_kicked, 2);
  assert.equal(result.refund_amount_each, 300000);
  assert.equal(state.walletRefundCalls.length, 1);
  assert.equal(state.walletRefundCalls[0].userId, 'member-paid');
  assert.deepEqual(state.payosCancelCalls, ['987654']);
  assert.equal(state.plannerInviteUpdateCalls.length, 1);
  assert.deepEqual(state.plannerInviteUpdateCalls[0].values, { status: 'expired' });
  assert.equal(state.notificationCreateCalls.length, 3);
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID03: deletePlanner throws not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.deletePlanner('missing-planner-id', 'owner-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner error:');
});

test('UTCID04: deletePlanner throws forbidden when requester is not planner owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.deletePlanner('planner-id', 'other-user-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner error:');
});

test('UTCID05: deletePlanner rejects ongoing planner deletion', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'ongoing',
    }),
  });

  await assert.rejects(
    PlannerService.deletePlanner('planner-id', 'owner-id'),
    { message: 'Cannot delete ongoing journey' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner error:');
});

test('UTCID06: deletePlanner rejects completed planner deletion', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'completed',
    }),
  });

  await assert.rejects(
    PlannerService.deletePlanner('planner-id', 'owner-id'),
    { message: 'Cannot delete completed plan' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner error:');
});

test('UTCID07: deletePlanner rejects deletion when planner is locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: true,
    joinWindowClosed: false,
  });

  await assert.rejects(
    PlannerService.deletePlanner('planner-id', 'owner-id'),
    { message: 'Planner is locked' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner error:');
});
