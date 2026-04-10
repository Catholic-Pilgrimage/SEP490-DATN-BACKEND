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
    deposit_amount: 300000,
    penalty_percentage: 15,
    status: 'planning',
    is_locked: true,
    started_at: null,
    share_token: 'share-token',
    qr_code_url: 'qr-code-url',
    created_at: new Date('2026-04-08T00:00:00.000Z'),
    updated_at: new Date('2026-04-08T00:00:00.000Z'),
    owner: {
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: null,
    },
    ...data,
  });
}

function applyFormatStubs(PlannerService) {
  PlannerService.getPlannerCurrentStatus = (planner) => planner.status;
  PlannerService.getPlannerStatusLockAt = () => null;
  PlannerService.getPlannerEffectiveEditLockAt = () => null;
  PlannerService.isPlannerLocked = () => false;
}

test('UTCID01: startPlanner starts a ready planning planner successfully', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'planning',
      is_locked: true,
    }),
  });

  applyFormatStubs(PlannerService);
  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    scheduleState: { isValid: true, missingDays: [], totalDays: 3 },
    isRealGroup: true,
    finalLocked: true,
  });

  const result = await PlannerService.startPlanner('planner-id', 'owner-id');

  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
  assert.equal(state.plannerInstanceUpdateCalls[0].values.status, 'ongoing');
  assert.equal(state.plannerInstanceUpdateCalls[0].values.is_locked, false);
  assert.ok(state.plannerInstanceUpdateCalls[0].values.started_at instanceof Date);
  assert.equal(result.status, 'ongoing');
  assert.equal(result.is_locked, false);
  assert.equal(state.infoLogs[0][0], 'Planner planner-id started by user owner-id (planning -> ongoing)');
});

test('UTCID02: startPlanner starts a locked planner successfully', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'locked',
      is_locked: true,
    }),
  });

  applyFormatStubs(PlannerService);
  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    scheduleState: { isValid: true, missingDays: [], totalDays: 3 },
    isRealGroup: true,
    finalLocked: true,
  });

  const result = await PlannerService.startPlanner('planner-id', 'owner-id');

  assert.equal(result.status, 'ongoing');
  assert.equal(result.is_locked, false);
  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
});

test('UTCID03: startPlanner throws not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.startPlanner('missing-planner-id', 'owner-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID04: startPlanner throws forbidden when requester is not owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'other-user-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID05: startPlanner rejects planner outside planning or locked status', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'completed',
    }),
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'owner-id'),
    { message: 'Planner is not in planning status' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID06: startPlanner rejects planner without start or end dates', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      start_date: null,
      end_date: null,
    }),
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'owner-id'),
    { message: 'Planner must have start_date and end_date to start' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID07: startPlanner rejects incomplete schedule', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    scheduleComplete: false,
    scheduleState: { isValid: false, missingDays: [2], totalDays: 3 },
    isRealGroup: true,
    finalLocked: true,
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'owner-id'),
    { message: 'Incomplete schedule: missing days 2, total days 3' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID08: startPlanner rejects group trip without enough joined members', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      number_of_people: 4,
    }),
  });

  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    scheduleState: { isValid: true, missingDays: [], totalDays: 3 },
    isRealGroup: false,
    finalLocked: true,
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'owner-id'),
    { message: 'Group trip requires at least 2 joined members' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});

test('UTCID09: startPlanner rejects planner that is not fully locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      number_of_people: 2,
    }),
  });

  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    scheduleState: { isValid: true, missingDays: [], totalDays: 3 },
    isRealGroup: true,
    finalLocked: false,
  });

  await assert.rejects(
    PlannerService.startPlanner('planner-id', 'owner-id'),
    { message: 'Planner must be locked before starting' }
  );

  assert.equal(state.errorLogs[0][0], 'Start planner error:');
});
