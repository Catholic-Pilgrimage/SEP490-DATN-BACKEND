const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRecord(factory, data = {}) {
  const planner = factory({
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Initial Planner',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    number_of_people: 4,
    transportation: 'bus',
    deposit_amount: 300000,
    penalty_percentage: 15,
    status: 'planning',
    is_locked: false,
    edit_lock_at: new Date('2026-04-09T12:00:00.000Z'),
    share_token: 'share-token',
    qr_code_url: 'qr-code-url',
    owner: {
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: null,
    },
    ...data,
  });

  planner.owner = planner.owner || {
    id: 'owner-id',
    full_name: 'Owner User',
    email: 'owner@example.com',
    avatar_url: null,
  };

  return planner;
}

function applyFormatStubs(PlannerService) {
  PlannerService.getPlannerCurrentStatus = () => 'planning';
  PlannerService.getPlannerStatusLockAt = () => null;
  PlannerService.getPlannerEffectiveEditLockAt = () => null;
  PlannerService.isPlannerLocked = () => false;
}

test('UTCID01: updatePlanner updates allowed fields successfully for owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  applyFormatStubs(PlannerService);
  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    committedSlots: 1,
    hasSharedCommitment: false,
  });

  const result = await PlannerService.updatePlanner('planner-id', 'owner-id', {
    name: '  Updated Planner  ',
    transportation: 'car',
  });

  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
  assert.deepEqual(state.plannerInstanceUpdateCalls[0].values, {
    name: 'Updated Planner',
    transportation: 'car',
  });
  assert.equal(result.name, 'Updated Planner');
  assert.equal(result.transportation, 'car');
  assert.equal(state.infoLogs[0][0], 'Planner updated by user owner-id: planner-id');
});

test('UTCID02: updatePlanner clears deposit penalty and edit lock when downgraded to solo', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  applyFormatStubs(PlannerService);
  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    committedSlots: 1,
    hasSharedCommitment: false,
  });

  const result = await PlannerService.updatePlanner('planner-id', 'owner-id', {
    number_of_people: 1,
  });

  assert.deepEqual(state.plannerInstanceUpdateCalls[0].values, {
    number_of_people: 1,
    deposit_amount: 0,
    penalty_percentage: 0,
    edit_lock_at: null,
    is_locked: false,
  });
  assert.equal(result.number_of_people, 1);
  assert.equal(result.deposit_amount, 0);
  assert.equal(result.penalty_percentage, 0);
});

test('UTCID03: updatePlanner throws not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.updatePlanner('missing-planner-id', 'owner-id', { name: 'Updated' }),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID04: updatePlanner throws forbidden when requester is not owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'other-user-id', { name: 'Updated' }),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID05: updatePlanner rejects completed planner updates', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'completed',
    }),
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'owner-id', { name: 'Updated' }),
    { message: 'Cannot update completed plan' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID06: updatePlanner rejects updates when planner is edit-locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: true,
    committedSlots: 1,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'owner-id', { name: 'Updated' }),
    { message: 'Planner is locked' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID07: updatePlanner rejects reducing capacity below committed slots', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    committedSlots: 3,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'owner-id', { number_of_people: 2 }),
    {
      message: 'Cannot reduce capacity below committed slots',
      requiredSlots: 3,
    }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID08: updatePlanner rejects positive deposit for solo planner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      number_of_people: 1,
      deposit_amount: 0,
      penalty_percentage: 0,
      edit_lock_at: null,
    }),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    committedSlots: 1,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'owner-id', { deposit_amount: 100000 }),
    { message: 'Solo planner cannot have a deposit amount' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});

test('UTCID09: updatePlanner rejects upgrading to group when lead time is under 48 hours', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      start_date: '2026-04-08',
      end_date: '2026-04-09',
      number_of_people: 1,
      deposit_amount: 0,
      penalty_percentage: 0,
      edit_lock_at: null,
    }),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    committedSlots: 1,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.updatePlanner('planner-id', 'owner-id', { number_of_people: 2 }),
    { message: 'Group lead time error' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner error:');
});
