const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerShareService } = require('./_plannerShareTestHelper');

function createPlannerRecord(data = {}) {
  return {
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Group Pilgrimage',
    start_date: '2026-04-20',
    end_date: '2026-04-22',
    number_of_people: 4,
    deposit_amount: 300000,
    status: 'planning',
    ...data,
  };
}

function buildInvite(data = {}) {
  const updateCalls = [];
  const invite = {
    id: 'invite-id',
    planner_id: 'planner-id',
    email: 'guest@example.com',
    invite_type: null,
    invitee_user_id: null,
    status: 'pending',
    token: 'invite-token',
    expires_at: new Date('2026-04-15T00:00:00.000Z'),
    planner: createPlannerRecord(),
    ...data,
  };
  invite.update = async (values, options) => {
    updateCalls.push({ values, options });
    Object.assign(invite, values);
    return invite;
  };
  return { invite, updateCalls };
}

function buildWallet(data = {}, saveCalls = []) {
  const wallet = {
    id: 'wallet-id',
    balance: 500000,
    locked_balance: 0,
    ...data,
  };
  wallet.save = async (options) => {
    saveCalls.push(options);
    return wallet;
  };
  return wallet;
}

function buildTransactionRecord(data = {}, updateCalls = []) {
  const tx = {
    id: 'tx-id',
    reference_id: 'planner-id:user-id:111111',
    status: 'pending',
    amount: 300000,
    ...data,
  };
  tx.update = async (values, options) => {
    updateCalls.push({ values, options });
    Object.assign(tx, values);
    return tx;
  };
  return tx;
}

test('UTCID01: respondToInvite rejects invalid action', async () => {
  const { PlannerShareService, state } = loadPlannerShareService();

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'user-id', 'maybe'),
    { message: 'Invalid action. Must be "accept" or "reject"' }
  );

  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});

test('UTCID02: respondToInvite throws when invite does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => null,
  });

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept'),
    { message: 'Invite not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});

test('UTCID03: respondToInvite accepts friend invite and joins immediately without deposit', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: 'friend',
    invitee_user_id: 'friend-id',
    email: 'friend@example.com',
    planner: createPlannerRecord(),
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      return null;
    },
  });

  const result = await PlannerShareService.respondToInvite('invite-token', 'friend-id', 'accept');

  assert.equal(result.deposit_required, false);
  assert.equal(result.joined, true);
  assert.equal(state.plannerMemberCreateCalls.length, 1);
  assert.equal(state.plannerMemberCreateCalls[0].data.user_id, 'friend-id');
  assert.equal(updateCalls.at(-1).values.status, 'accepted');
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_joined');
  assert.equal(state.plannerChatCalls.length, 1);
});

test('UTCID04: respondToInvite rejects friend invite for another user', async () => {
  const { invite } = buildInvite({
    invite_type: 'friend',
    invitee_user_id: 'another-user-id',
    email: 'friend@example.com',
    planner: createPlannerRecord(),
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async () => ({ id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' }),
  });

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'friend-id', 'accept'),
    { message: 'This friend invite is for another user' }
  );

  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});

test('UTCID05: respondToInvite rejects external invite when email does not match', async () => {
  const { invite } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    planner: createPlannerRecord(),
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async () => ({ id: 'user-id', full_name: 'Guest User', email: 'other@example.com' }),
  });

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept'),
    { message: 'Email mismatch. This invite is for another user' }
  );

  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});

test('UTCID06: respondToInvite auto-deducts wallet and joins successfully for external invite', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    planner: createPlannerRecord({ deposit_amount: 300000 }),
  });
  const walletSaveCalls = [];
  const wallet = buildWallet({ balance: 500000, locked_balance: 0 }, walletSaveCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async () => ({ id: 'user-id', full_name: 'Guest User', email: 'guest@example.com' }),
    getOrCreateWallet: async () => ({ id: 'wallet-id', balance: 500000, locked_balance: 0 }),
    walletFindByPk: async () => wallet,
    transactionCreate: async (data) => ({ id: 'wallet-tx-id', ...data }),
  });

  const result = await PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept');

  assert.equal(result.deposit_required, false);
  assert.equal(result.paid_from_wallet, true);
  assert.equal(state.transactionCreateCalls.length, 1);
  assert.equal(state.transactionCreateCalls[0].data.status, 'completed');
  assert.equal(state.plannerMemberCreateCalls.length, 1);
  assert.equal(updateCalls[0].values.status, 'awaiting_payment');
  assert.equal(updateCalls.at(-1).values.status, 'accepted');
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(wallet.balance, 200000);
  assert.equal(wallet.locked_balance, 300000);
  assert.equal(walletSaveCalls.length, 1);
});

test('UTCID07: respondToInvite returns payment link when wallet balance is insufficient', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    planner: createPlannerRecord({ deposit_amount: 300000 }),
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async () => ({ id: 'user-id', full_name: 'Guest User', email: 'guest@example.com' }),
    getOrCreateWallet: async () => ({ id: 'wallet-id', balance: 100000, locked_balance: 0 }),
    generateOrderCode: () => 987654,
    createPaymentLink: async () => ({
      checkoutUrl: 'https://pay.example/checkout/987654',
      qrCode: 'data:image/png;base64,payos-qr',
    }),
    transactionCreate: async (data) => ({ id: 'pending-tx-id', ...data }),
  });

  const result = await PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept');

  assert.equal(result.deposit_required, true);
  assert.equal(result.order_code, 987654);
  assert.equal(result.checkout_url, 'https://pay.example/checkout/987654');
  assert.equal(state.transactionCreateCalls.length, 1);
  assert.equal(state.transactionCreateCalls[0].data.status, 'pending');
  assert.equal(updateCalls[0].values.status, 'awaiting_payment');
  assert.equal(state.payosCreatePaymentLinkCalls.length, 1);
});

test('UTCID08: respondToInvite rejects invite successfully', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    planner: createPlannerRecord(),
  });

  const { PlannerShareService } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindByPk: async () => ({ id: 'user-id', full_name: 'Guest User', email: 'guest@example.com' }),
  });

  const result = await PlannerShareService.respondToInvite('invite-token', 'user-id', 'reject');

  assert.equal(result.messageKey, 'planner.invite_rejected');
  assert.equal(updateCalls.at(-1).values.status, 'rejected');
});

test('UTCID09: respondToInvite expires invite when planner join window is closed', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    planner: createPlannerRecord(),
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    getPlannerState: async () => ({ joinWindowClosed: true, scheduleComplete: true }),
  });

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept'),
    { message: 'Planner join window is closed' }
  );

  assert.equal(updateCalls.at(-1).values.status, 'expired');
  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});

test('UTCID10: respondToInvite cleans up expired awaiting_payment invite and cancels stale transaction', async () => {
  const { invite, updateCalls } = buildInvite({
    invite_type: null,
    email: 'guest@example.com',
    status: 'awaiting_payment',
    expires_at: new Date('2026-04-01T00:00:00.000Z'),
    planner: createPlannerRecord(),
  });
  const staleUpdateCalls = [];
  const staleTransaction = buildTransactionRecord({
    reference_id: 'planner-id:user-id:111111',
    status: 'pending',
  }, staleUpdateCalls);

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindOne: async () => invite,
    userFindOne: async () => ({ id: 'user-id' }),
    transactionFindOne: async () => staleTransaction,
  });

  await assert.rejects(
    PlannerShareService.respondToInvite('invite-token', 'user-id', 'accept'),
    { message: 'Invite has expired' }
  );

  assert.equal(state.payosCancelPaymentLinkCalls[0], '111111');
  assert.equal(staleUpdateCalls[0].values.status, 'cancelled');
  assert.equal(updateCalls.at(-1).values.status, 'expired');
  assert.equal(state.errorLogs[0][0], 'Respond to invite error:');
});
