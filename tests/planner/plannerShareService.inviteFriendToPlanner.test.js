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
    transportation: 'bus',
    status: 'planning',
    ...data,
  };
}

test('UTCID01: inviteFriendToPlanner creates friend invite successfully', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  const result = await PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id');

  assert.equal(result.invite_type, 'friend');
  assert.equal(result.friend.id, 'friend-id');
  assert.equal(state.plannerInviteCreateCalls.length, 1);
  assert.equal(state.plannerInviteCreateCalls[0].data.invitee_user_id, 'friend-id');
  assert.equal(state.plannerInviteCreateCalls[0].data.invite_type, 'friend');
  assert.equal(state.notificationCreateCalls.length, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_friend_invite');
});

test('UTCID02: inviteFriendToPlanner throws when planner does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID03: inviteFriendToPlanner throws forbidden when requester is not owner', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
  });

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'other-user-id', 'friend-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID04: inviteFriendToPlanner throws when owner invites self', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'owner-id'),
    { message: 'Cannot invite yourself' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID05: inviteFriendToPlanner throws when users are not friends', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  const friendshipService = require('../../services/pilgrim/friendshipService');
  friendshipService.areFriends = async () => false;

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'Not friends. Can only use friend invite for accepted friends' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID06: inviteFriendToPlanner throws when friend user does not exist', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async (userId) => {
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'User not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID07: inviteFriendToPlanner throws when planner is full', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord({ number_of_people: 3 }),
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
    plannerMemberCount: async () => 1,
    plannerInviteCount: async () => 1,
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'Planner is full. Max participants: 3' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID08: inviteFriendToPlanner throws when active invite already exists for friend', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
    plannerInviteFindOne: async () => ({ id: 'invite-id', status: 'pending' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'User already invited' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID09: inviteFriendToPlanner throws when friend is already a joined member', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
    plannerMemberFindOne: async () => ({ id: 'member-id', join_status: 'joined' }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'User is already a member' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});

test('UTCID10: inviteFriendToPlanner throws when join window is closed after readiness check', async () => {
  const { PlannerShareService, state } = loadPlannerShareService({
    plannerFindByPk: async () => createPlannerRecord(),
    userFindByPk: async (userId) => {
      if (userId === 'friend-id') {
        return { id: 'friend-id', full_name: 'Friend User', email: 'friend@example.com' };
      }
      if (userId === 'owner-id') {
        return { id: 'owner-id', full_name: 'Owner User' };
      }
      return null;
    },
    getPlannerState: async () => ({ joinWindowClosed: true }),
  });

  PlannerShareService.expireActiveInvitesForPlanner = async () => {};
  PlannerShareService.validatePlannerCanInviteMembers = async () => {};

  await assert.rejects(
    PlannerShareService.inviteFriendToPlanner('planner-id', 'owner-id', 'friend-id'),
    { message: 'Planner join window is closed' }
  );

  assert.equal(state.errorLogs[0][0], 'Invite friend to planner error:');
});
