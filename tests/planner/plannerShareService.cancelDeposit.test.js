const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerShareService } = require('./_plannerShareTestHelper');

function buildInvite(data = {}, updateCalls = []) {
  const invite = {
    id: 'invite-id',
    planner_id: 'planner-id',
    status: 'awaiting_payment',
    email: 'guest@example.com',
    ...data,
  };
  invite.update = async (values, options) => {
    updateCalls.push({ values, options });
    Object.assign(invite, values);
    return invite;
  };
  return invite;
}

function buildPendingTransaction(data = {}, updateCalls = []) {
  const transaction = {
    id: 'tx-id',
    reference_id: 'planner-id:user-id:123456',
    status: 'pending',
    ...data,
  };
  transaction.update = async (values, options) => {
    updateCalls.push({ values, options });
    Object.assign(transaction, values);
    return transaction;
  };
  return transaction;
}

test('UTCID01: cancelDeposit resets invite to pending and cancels pending transaction', async () => {
  const inviteUpdateCalls = [];
  const txUpdateCalls = [];
  const invite = buildInvite({}, inviteUpdateCalls);
  const pendingTx = buildPendingTransaction({}, txUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com' }),
    plannerInviteFindOne: async () => invite,
    transactionFindOne: async () => pendingTx,
  });

  const result = await PlannerShareService.cancelDeposit('user-id', 'planner-id', false);

  assert.equal(result.messageKey, 'planner.deposit_cancelled');
  assert.equal(state.payosCancelPaymentLinkCalls[0], '123456');
  assert.equal(txUpdateCalls[0].values.status, 'cancelled');
  assert.equal(inviteUpdateCalls[0].values.status, 'pending');
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
});

test('UTCID02: cancelDeposit rejects invite permanently when reject flag is true', async () => {
  const inviteUpdateCalls = [];
  const txUpdateCalls = [];
  const invite = buildInvite({}, inviteUpdateCalls);
  const pendingTx = buildPendingTransaction({}, txUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com' }),
    plannerInviteFindOne: async () => invite,
    transactionFindOne: async () => pendingTx,
  });

  const result = await PlannerShareService.cancelDeposit('user-id', 'planner-id', true);

  assert.equal(result.messageKey, 'planner.invite_rejected_after_deposit_cancel');
  assert.equal(inviteUpdateCalls[0].values.status, 'rejected');
  assert.equal(txUpdateCalls[0].values.status, 'cancelled');
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID03: cancelDeposit throws when user does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerShareService.cancelDeposit('missing-user-id', 'planner-id', false),
    { message: 'User not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Cancel deposit error:');
});

test('UTCID04: cancelDeposit throws when awaiting_payment invite does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com' }),
    plannerInviteFindOne: async () => null,
  });

  await assert.rejects(
    PlannerShareService.cancelDeposit('user-id', 'planner-id', false),
    { message: 'No pending deposit found for this invite' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Cancel deposit error:');
});

test('UTCID05: cancelDeposit still updates invite when pending transaction is not found', async () => {
  const inviteUpdateCalls = [];
  const invite = buildInvite({}, inviteUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com' }),
    plannerInviteFindOne: async () => invite,
    transactionFindOne: async () => null,
  });

  const result = await PlannerShareService.cancelDeposit('user-id', 'planner-id', false);

  assert.equal(result.messageKey, 'planner.deposit_cancelled');
  assert.equal(inviteUpdateCalls[0].values.status, 'pending');
  assert.equal(state.payosCancelPaymentLinkCalls.length, 0);
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID06: cancelDeposit logs warning when PayOS cancellation fails but still succeeds', async () => {
  const inviteUpdateCalls = [];
  const txUpdateCalls = [];
  const invite = buildInvite({}, inviteUpdateCalls);
  const pendingTx = buildPendingTransaction({}, txUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com' }),
    plannerInviteFindOne: async () => invite,
    transactionFindOne: async () => pendingTx,
    cancelPaymentLink: async () => {
      throw new Error('PayOS unavailable');
    },
  });

  const result = await PlannerShareService.cancelDeposit('user-id', 'planner-id', false);

  assert.equal(result.messageKey, 'planner.deposit_cancelled');
  assert.match(state.warnLogs[0][0], /Could not cancel PayOS order:/);
  assert.equal(txUpdateCalls[0].values.status, 'cancelled');
  assert.equal(inviteUpdateCalls[0].values.status, 'pending');
  assert.equal(state.transactionCommitCalls, 1);
});
