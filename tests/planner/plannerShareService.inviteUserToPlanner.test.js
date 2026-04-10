const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerShareService } = require('./_plannerShareTestHelper');

function createPlannerRecord(data = {}) {
  return {
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Group Pilgrimage',
    start_date: '2026-04-15',
    end_date: '2026-04-17',
    number_of_days: 3,
    number_of_people: 4,
    transportation: 'bus',
    status: 'planning',
    ...data,
  };
}

test('UTCID01: inviteUserToPlanner creates invite successfully and normalizes email', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async () => ({ id: 'owner-id', full_name: 'Owner User', email: 'owner@example.com' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  const result = await PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', '  GUEST@EXAMPLE.COM  ');

  assert.equal(state.plannerInviteCreateCalls.length, 1);
  assert.equal(state.plannerInviteCreateCalls[0].data.email, 'guest@example.com');
  assert.equal(state.emailCalls.length, 1);
  assert.equal(state.emailCalls[0][0], 'guest@example.com');
  assert.equal(result.email, 'guest@example.com');
  assert.match(result.invite_link, /planners\/invite\//);
  assert.match(result.qr_code, /^data:image\/png;base64,/);
  assert.equal(state.notificationCreateCalls.length, 0);
});

test('UTCID02: inviteUserToPlanner sends in-app notification when invitee already has account', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindOne: async () => ({ id: 'invitee-id', email: 'friend@example.com' }),
    plannerMemberFindOne: async () => ({ id: 'member-id', join_status: 'dropped_out' }),
    userFindByPk: async () => ({ id: 'owner-id', full_name: 'Owner User', email: 'owner@example.com' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  const result = await PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'friend@example.com');

  assert.equal(result.email, 'friend@example.com');
  assert.equal(state.notificationCreateCalls.length, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_invite');
  assert.equal(state.notificationCreateCalls[0].receiverId, 'invitee-id');
});

test('UTCID03: inviteUserToPlanner throws when planner does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'guest@example.com'),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite user to planner error:');
});

test('UTCID04: inviteUserToPlanner throws forbidden when requester is not owner', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
  });

  await assert.rejects(
    PlannerShareService.inviteUserToPlanner('planner-id', 'other-user-id', 'guest@example.com'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite user to planner error:');
});

test('UTCID05: inviteUserToPlanner throws when planner is full', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord({ number_of_people: 3 }),
    plannerMemberCount: async () => 1,
    plannerInviteCount: async () => 1,
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'guest@example.com'),
    { message: 'Planner is full. Max participants: 3' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite user to planner error:');
});

test('UTCID06: inviteUserToPlanner throws when active invite already exists for email', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    plannerInviteFindOne: async () => ({ id: 'invite-id', status: 'pending' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'guest@example.com'),
    { message: 'User already invited' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite user to planner error:');
});

test('UTCID07: inviteUserToPlanner throws when existing user is already a joined member', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindOne: async () => ({ id: 'invitee-id', email: 'member@example.com' }),
    plannerMemberFindOne: async () => ({ id: 'member-id', join_status: 'joined' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'member@example.com'),
    { message: 'User is already a member' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite user to planner error:');
});

test('UTCID08: inviteUserToPlanner still returns invite when email sending fails', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async () => ({ id: 'owner-id', full_name: 'Owner User', email: 'owner@example.com' }),
    sendPlannerInvitation: async () => {
      throw new Error('SMTP unavailable');
    },
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  const result = await PlannerShareService.inviteUserToPlanner('planner-id', 'owner-id', 'guest@example.com');

  assert.equal(result.email, 'guest@example.com');
  assert.equal(state.errorLogs[0][0], 'Failed to send planner invitation email:');
  assert.equal(state.infoLogs.at(-1)[0], 'Invite sent to guest@example.com for planner planner-id');
});
