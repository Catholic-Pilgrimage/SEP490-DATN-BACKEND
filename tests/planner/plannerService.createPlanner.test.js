const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOffset(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

test('UTCID01: createPlanner creates a solo planner and clears deposit fields', async () => {
  const { PlannerService, state } = loadPlannerService();

  const result = await PlannerService.createPlanner('pilgrim-id', {
    name: ' Solo Pilgrimage ',
    number_of_people: 1,
    transportation: 'bus',
    start_date: dateOffset(1),
    end_date: dateOffset(2),
    deposit_amount: 500000,
    penalty_percentage: 25,
  });

  assert.equal(result.name, 'Solo Pilgrimage');
  assert.equal(result.number_of_people, 1);
  assert.equal(result.deposit_amount, 0);
  assert.equal(result.penalty_percentage, 0);
  assert.equal(result.status, 'planning');
  assert.equal(state.plannerCreateCalls.length, 1);
  assert.equal(state.plannerCreateCalls[0].data.deposit_amount, 0);
  assert.equal(state.plannerMemberCreateCalls[0].data.user_id, 'pilgrim-id');
  assert.equal(state.plannerMemberCreateCalls[0].data.deposit_status, null);
  assert.equal(state.transactionRequests, 1);
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
});

test('UTCID02: createPlanner creates a group planner with deposit and penalty settings', async () => {
  const { PlannerService, state } = loadPlannerService();

  const result = await PlannerService.createPlanner('pilgrim-id', {
    name: 'Group Pilgrimage',
    number_of_people: 4,
    transportation: 'car',
    start_date: dateOffset(4),
    end_date: dateOffset(6),
    deposit_amount: 300000,
    penalty_percentage: 15,
  });

  assert.equal(result.number_of_people, 4);
  assert.equal(result.deposit_amount, 300000);
  assert.equal(result.penalty_percentage, 15);
  assert.equal(state.plannerCreateCalls[0].data.deposit_amount, 300000);
  assert.equal(state.plannerCreateCalls[0].data.penalty_percentage, 15);
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID03: createPlanner rejects missing planner name', async () => {
  const { PlannerService, state } = loadPlannerService();

  await assert.rejects(
    PlannerService.createPlanner('pilgrim-id', {
      name: '   ',
      number_of_people: 1,
      start_date: dateOffset(1),
      end_date: dateOffset(2),
    }),
    { message: 'Name is required' }
  );

  assert.equal(state.plannerCreateCalls.length, 0);
  assert.equal(state.transactionRequests, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: createPlanner rejects solo planner that starts today', async () => {
  const { PlannerService, state } = loadPlannerService();

  await assert.rejects(
    PlannerService.createPlanner('pilgrim-id', {
      name: 'Today Trip',
      number_of_people: 1,
      start_date: dateOffset(0),
      end_date: dateOffset(1),
    })
  );

  assert.equal(state.plannerCreateCalls.length, 0);
  assert.equal(state.transactionRequests, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: createPlanner rejects group planner without 48-hour lead time', async () => {
  const { PlannerService, state } = loadPlannerService();

  await assert.rejects(
    PlannerService.createPlanner('pilgrim-id', {
      name: 'Urgent Group Trip',
      number_of_people: 3,
      start_date: dateOffset(1),
      end_date: dateOffset(2),
      deposit_amount: 200000,
    }),
    { message: 'Group lead time error' }
  );

  assert.equal(state.plannerCreateCalls.length, 0);
  assert.equal(state.transactionRequests, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID06: createPlanner rejects overlapping planner dates and exposes conflict dates', async () => {
  const overlapStart = dateOffset(6);
  const overlapEnd = dateOffset(8);

  const { PlannerService, state } = loadPlannerService({
    plannerFindAll: async () => ([
      {
        id: 'planner-existing',
        name: 'Existing Planner',
        start_date: overlapStart,
        end_date: overlapEnd,
      },
    ]),
  });

  await assert.rejects(
    PlannerService.createPlanner('pilgrim-id', {
      name: 'Conflicting Planner',
      number_of_people: 2,
      start_date: dateOffset(5),
      end_date: dateOffset(7),
      deposit_amount: 150000,
    }),
    (error) => {
      assert.equal(error.message, 'Planner dates overlap');
      assert.deepEqual(error.conflictDates, [dateOffset(6), dateOffset(7)]);
      return true;
    }
  );

  assert.equal(state.plannerCreateCalls.length, 0);
  assert.equal(state.transactionRequests, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID07: createPlanner rejects end date before start date', async () => {
  const { PlannerService, state } = loadPlannerService();

  await assert.rejects(
    PlannerService.createPlanner('pilgrim-id', {
      name: 'Invalid Range',
      number_of_people: 2,
      start_date: dateOffset(6),
      end_date: dateOffset(5),
      deposit_amount: 100000,
    }),
    { message: 'End date must be after or equal to start date' }
  );

  assert.equal(state.plannerCreateCalls.length, 0);
  assert.equal(state.transactionRequests, 0);
  assert.equal(state.errorLogs.length, 1);
});
