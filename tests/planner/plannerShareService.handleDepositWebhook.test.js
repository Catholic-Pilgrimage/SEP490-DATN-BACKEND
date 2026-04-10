const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerShareService } = require('./_plannerShareTestHelper');

function createPlanner(data = {}) {
  return {
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Group Pilgrimage',
    start_date: '2026-04-20',
    end_date: '2026-04-22',
    status: 'planning',
    ...data,
  };
}

function createTransactionRecord(data = {}, saveCalls = []) {
  const tx = {
    id: 'tx-id',
    wallet_id: 'wallet-id',
    reference_id: 'planner-id:user-id:123456',
    status: 'pending',
    amount: 300000,
    save: async (options) => {
      saveCalls.push(options);
      return tx;
    },
    ...data,
  };
  return tx;
}

function createWallet(data = {}, saveCalls = []) {
  const wallet = {
    id: 'wallet-id',
    balance: 0,
    locked_balance: 0,
    save: async (options) => {
      saveCalls.push(options);
      return wallet;
    },
    ...data,
  };
  return wallet;
}

function createInvite(data = {}, updateCalls = []) {
  const invite = {
    id: 'invite-id',
    planner_id: 'planner-id',
    status: 'awaiting_payment',
    email: 'guest@example.com',
    update: async (values, options) => {
      updateCalls.push({ values, options });
      Object.assign(invite, values);
      return invite;
    },
    ...data,
  };
  return invite;
}

function createExistingMember(data = {}, saveCalls = []) {
  const member = {
    planner_id: 'planner-id',
    user_id: 'user-id',
    join_status: 'dropped_out',
    deposit_status: null,
    save: async (options) => {
      saveCalls.push(options);
      return member;
    },
    ...data,
  };
  return member;
}

test('UTCID01: handleDepositWebhook returns payment-not-successful when PayOS code is not 00', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '01' }),
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, false);
  assert.equal(result.messageKey, 'planner.deposit_payment_not_successful');
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.warnLogs[0][0], 'Deposit webhook: payment not successful');
});

test('UTCID02: handleDepositWebhook returns topup result when order belongs to wallet topup flow', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    handleTopupWebhookByOrderCode: async () => ({ success: true, messageKey: 'wallet.topup_processed' }),
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.messageKey, 'wallet.topup_processed');
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.walletHandleTopupCalls[0], '123456');
});

test('UTCID03: handleDepositWebhook returns transaction-not-found when escrow transaction does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    handleTopupWebhookByOrderCode: async () => null,
    transactionFindOne: async () => null,
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, false);
  assert.equal(result.messageKey, 'planner.deposit_transaction_not_found');
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID04: handleDepositWebhook returns already-processed for completed transaction', async () => {
  const tx = createTransactionRecord({ status: 'completed' });

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, true);
  assert.equal(result.messageKey, 'planner.deposit_already_processed');
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID05: handleDepositWebhook ignores late webhook for cancelled transaction', async () => {
  const tx = createTransactionRecord({ status: 'cancelled' });

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, false);
  assert.equal(result.messageKey, 'planner.deposit_transaction_cancelled');
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID06: handleDepositWebhook completes deposit and creates planner member successfully', async () => {
  const txSaveCalls = [];
  const walletSaveCalls = [];
  const inviteUpdateCalls = [];
  const tx = createTransactionRecord({ status: 'pending' }, txSaveCalls);
  const wallet = createWallet({ locked_balance: 0 }, walletSaveCalls);
  const invite = createInvite({}, inviteUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
    walletFindByPk: async () => wallet,
    plannerMemberFindOne: async () => null,
    userFindByPk: async (userId) => {
      if (userId === 'user-id') {
        return { id: 'user-id', email: 'guest@example.com', full_name: 'Guest User' };
      }
      return null;
    },
    plannerInviteFindOne: async () => invite,
    plannerFindByPk: async () => createPlanner(),
    getPlannerState: async () => ({ scheduleComplete: true, joinWindowClosed: false }),
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, true);
  assert.equal(result.messageKey, 'planner.deposit_webhook_processed');
  assert.equal(tx.status, 'completed');
  assert.equal(wallet.locked_balance, 300000);
  assert.equal(txSaveCalls.length, 1);
  assert.equal(walletSaveCalls.length, 1);
  assert.equal(state.plannerMemberCreateCalls.length, 1);
  assert.equal(inviteUpdateCalls[0].values.status, 'accepted');
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_joined');
  assert.equal(state.plannerChatCalls.length, 1);
});

test('UTCID07: handleDepositWebhook returns refund-needed when invite is no longer awaiting payment', async () => {
  const tx = createTransactionRecord({ status: 'pending' });
  const wallet = createWallet({ locked_balance: 0 });

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
    walletFindByPk: async () => wallet,
    plannerMemberFindOne: async () => null,
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com', full_name: 'Guest User' }),
    plannerInviteFindOne: async () => null,
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, true);
  assert.equal(result.messageKey, 'planner.deposit_invite_expired_refund_needed');
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID08: handleDepositWebhook expires invite when planner is closed and marks refund-needed', async () => {
  const tx = createTransactionRecord({ status: 'pending' });
  const wallet = createWallet({ locked_balance: 0 });
  const inviteUpdateCalls = [];
  const invite = createInvite({}, inviteUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
    walletFindByPk: async () => wallet,
    plannerMemberFindOne: async () => null,
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com', full_name: 'Guest User' }),
    plannerInviteFindOne: async () => invite,
    plannerFindByPk: async () => createPlanner({ status: 'ongoing' }),
    getPlannerState: async () => ({ scheduleComplete: true, joinWindowClosed: false }),
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, true);
  assert.equal(result.messageKey, 'planner.deposit_planner_closed_refund_needed');
  assert.equal(inviteUpdateCalls[0].values.status, 'expired');
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID09: handleDepositWebhook reactivates dropped-out member on successful re-invite payment', async () => {
  const tx = createTransactionRecord({ status: 'pending' });
  const wallet = createWallet({ locked_balance: 0 });
  const inviteUpdateCalls = [];
  const memberSaveCalls = [];
  const invite = createInvite({}, inviteUpdateCalls);
  const existingMember = createExistingMember({}, memberSaveCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    verifyWebhookData: async () => ({ code: '00', data: { orderCode: '123456' } }),
    transactionFindOne: async () => tx,
    walletFindByPk: async () => wallet,
    plannerMemberFindOne: async () => existingMember,
    userFindByPk: async () => ({ id: 'user-id', email: 'guest@example.com', full_name: 'Guest User' }),
    plannerInviteFindOne: async () => invite,
    plannerFindByPk: async () => createPlanner(),
    getPlannerState: async () => ({ scheduleComplete: true, joinWindowClosed: false }),
  });

  const result = await PlannerShareService.handleDepositWebhook({ orderCode: '123456' });

  assert.equal(result.success, true);
  assert.equal(existingMember.join_status, 'joined');
  assert.equal(existingMember.deposit_status, 'paid');
  assert.equal(memberSaveCalls.length, 1);
  assert.equal(inviteUpdateCalls[0].values.status, 'accepted');
  assert.equal(state.transactionCommitCalls, 1);
});
