const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRecord(factory, data = {}) {
  const planner = factory({
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    number_of_people: 4,
    transportation: 'bus',
    deposit_amount: 300000,
    penalty_percentage: 15,
    status: 'ongoing',
    is_locked: false,
    started_at: new Date('2026-04-09T08:00:00.000Z'),
    completed_at: null,
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

  return planner;
}

function applyFormatStubs(PlannerService) {
  PlannerService.getPlannerCurrentStatus = (planner) => planner.status;
  PlannerService.getPlannerStatusLockAt = () => null;
  PlannerService.getPlannerEffectiveEditLockAt = () => null;
  PlannerService.isPlannerLocked = () => false;
}

test('UTCID01: completePlanner marks planner completed when there are visited sites', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  applyFormatStubs(PlannerService);
  PlannerService.validatePlannerContinuity = async () => ({
    isValid: true,
    missingDays: [],
    totalDays: 3,
  });
  PlannerService.getCheckinStats = async () => ({
    visitedCount: 2,
    percentage: 67,
  });

  const result = await PlannerService.completePlanner('planner-id', 'owner-id');

  assert.equal(state.transactionRequests, 1);
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
  assert.equal(state.plannerInstanceUpdateCalls[0].values.status, 'completed');
  assert.ok(state.plannerInstanceUpdateCalls[0].values.completed_at instanceof Date);
  assert.equal(state.antiFraudCalls.length, 1);
  assert.equal(state.antiFraudCalls[0].plannerId, 'planner-id');
  assert.equal(
    state.antiFraudCalls[0].transaction,
    state.plannerInstanceUpdateCalls[0].options.transaction
  );
  assert.equal(result.status, 'completed');
  assert.equal(state.infoLogs[0][0], 'Planner planner-id completed (2 sites visited)');
});

test('UTCID02: completePlanner cancels planner when visited count is zero', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  applyFormatStubs(PlannerService);
  PlannerService.validatePlannerContinuity = async () => ({
    isValid: true,
    missingDays: [],
    totalDays: 3,
  });
  PlannerService.getCheckinStats = async () => ({
    visitedCount: 0,
    percentage: 0,
  });

  const result = await PlannerService.completePlanner('planner-id', 'owner-id');

  assert.equal(state.plannerInstanceUpdateCalls.length, 1);
  assert.deepEqual(state.plannerInstanceUpdateCalls[0].values, {
    status: 'cancelled',
  });
  assert.equal(state.antiFraudCalls.length, 1);
  assert.equal(
    state.antiFraudCalls[0].transaction,
    state.plannerInstanceUpdateCalls[0].options.transaction
  );
  assert.equal(result.status, 'cancelled');
  assert.equal(state.infoLogs[0][0], 'Planner planner-id cancelled (0 sites visited)');
});

test('UTCID03: completePlanner throws when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.completePlanner('missing-planner-id', 'owner-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Complete planner error:');
});

test('UTCID04: completePlanner throws forbidden when requester is not owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.completePlanner('planner-id', 'other-user-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Complete planner error:');
});

test('UTCID05: completePlanner throws when planner is not ongoing', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'planning',
    }),
  });

  await assert.rejects(
    PlannerService.completePlanner('planner-id', 'owner-id'),
    { message: 'Planner is not ongoing' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Complete planner error:');
});

test('UTCID06: completePlanner throws when planner schedule is incomplete', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.validatePlannerContinuity = async () => ({
    isValid: false,
    missingDays: [2],
    totalDays: 3,
  });

  await assert.rejects(
    PlannerService.completePlanner('planner-id', 'owner-id'),
    { message: 'Incomplete schedule: missing days 2, total days 3' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Complete planner error:');
});

test('UTCID07: completePlanner rolls back when anti-fraud settlement fails after completion update', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    verifyAndSettlePlanner: async () => {
      throw new Error('Settlement failed');
    },
  });

  applyFormatStubs(PlannerService);
  PlannerService.validatePlannerContinuity = async () => ({
    isValid: true,
    missingDays: [],
    totalDays: 3,
  });
  PlannerService.getCheckinStats = async () => ({
    visitedCount: 1,
    percentage: 33,
  });

  await assert.rejects(
    PlannerService.completePlanner('planner-id', 'owner-id'),
    { message: 'Settlement failed' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.plannerInstanceUpdateCalls[0].values.status, 'completed');
  assert.equal(state.errorLogs[0][0], 'Complete planner error:');
});
