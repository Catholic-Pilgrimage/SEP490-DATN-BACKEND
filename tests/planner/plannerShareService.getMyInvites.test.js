const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerShareService } = require('./_plannerShareTestHelper');

function createInvite(data = {}) {
  return {
    id: 'invite-id',
    token: 'invite-token',
    invite_type: null,
    status: 'pending',
    expires_at: new Date('2026-04-15T00:00:00.000Z'),
    created_at: new Date('2026-04-08T00:00:00.000Z'),
    planner: {
      id: 'planner-id',
      name: 'Group Pilgrimage',
    },
    inviter: {
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: 'avatar.png',
    },
    ...data,
  };
}

test('UTCID01: getMyInvites returns mapped external invites and normalizes email input', async () => {
  const invite = createInvite({
    id: 'invite-1',
    token: 'token-1',
    invite_type: null,
    status: 'pending',
  });

  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindAll: async () => [invite],
  });

  const result = await PlannerShareService.getMyInvites('user-id', '  GUEST@EXAMPLE.COM  ');

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'invite-1');
  assert.equal(result[0].token, 'token-1');
  assert.equal(result[0].planner.name, 'Group Pilgrimage');
  assert.equal(result[0].inviter.full_name, 'Owner User');
  assert.equal(state.plannerInviteFindAllCalls.length, 1);
});

test('UTCID02: getMyInvites returns friend invites matched by invitee_user_id even without email', async () => {
  const invite = createInvite({
    id: 'invite-2',
    token: 'token-2',
    invite_type: 'friend',
    status: 'awaiting_payment',
  });

  const { PlannerShareService } = loadPlannerShareService({
    plannerInviteFindAll: async () => [invite],
  });

  const result = await PlannerShareService.getMyInvites('friend-id', '');

  assert.equal(result.length, 1);
  assert.equal(result[0].invite_type, 'friend');
  assert.equal(result[0].status, 'awaiting_payment');
});

test('UTCID03: getMyInvites returns empty list when there are no matching invites', async () => {
  const { PlannerShareService } = loadPlannerShareService({
    plannerInviteFindAll: async () => [],
  });

  const result = await PlannerShareService.getMyInvites('user-id', 'guest@example.com');

  assert.deepEqual(result, []);
});

test('UTCID04: getMyInvites preserves multiple invites order and mapped fields', async () => {
  const firstInvite = createInvite({
    id: 'invite-3',
    token: 'token-3',
    created_at: new Date('2026-04-08T12:00:00.000Z'),
    status: 'awaiting_payment',
  });
  const secondInvite = createInvite({
    id: 'invite-4',
    token: 'token-4',
    created_at: new Date('2026-04-07T12:00:00.000Z'),
    status: 'pending',
  });

  const { PlannerShareService } = loadPlannerShareService({
    plannerInviteFindAll: async () => [firstInvite, secondInvite],
  });

  const result = await PlannerShareService.getMyInvites('user-id', 'guest@example.com');

  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'invite-3');
  assert.equal(result[1].id, 'invite-4');
  assert.equal(result[0].status, 'awaiting_payment');
  assert.equal(result[1].status, 'pending');
});

test('UTCID05: getMyInvites logs and rethrows database errors', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerInviteFindAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PlannerShareService.getMyInvites('user-id', 'guest@example.com'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs[0][0], 'Get my invites error:');
});
