const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRow(data) {
  return {
    is_active: true,
    created_at: new Date('2026-04-07T00:00:00.000Z'),
    updated_at: new Date('2026-04-07T00:00:00.000Z'),
    owner: {
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: null,
    },
    ...data,
  };
}

test('UTCID01: getUserPlanners returns owned and joined planners with pagination metadata', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerMemberFindAll: async () => ([
      { planner_id: 'planner-joined-1', join_status: 'joined', deposit_status: 'paid' },
      { planner_id: 'planner-joined-2', join_status: 'joined', deposit_status: 'paid' },
    ]),
    plannerFindAndCountAll: async () => ({
      rows: [
        createPlannerRow({
          id: 'planner-owned',
          user_id: 'pilgrim-id',
          name: 'Owned Planner',
          start_date: '2026-04-10',
          end_date: '2026-04-12',
          number_of_people: 1,
          transportation: 'bus',
          deposit_amount: 0,
          penalty_percentage: 0,
          status: 'planning',
        }),
        createPlannerRow({
          id: 'planner-joined-1',
          user_id: 'other-owner-id',
          name: 'Joined Planner',
          start_date: '2026-04-15',
          end_date: '2026-04-17',
          number_of_people: 4,
          transportation: 'car',
          deposit_amount: 300000,
          penalty_percentage: 15,
          status: 'planning',
        }),
      ],
      count: 2,
    }),
  });

  const syncCalls = [];
  PlannerService.syncPlannerLockState = async (planner) => {
    syncCalls.push(planner.id);
  };

  const result = await PlannerService.getUserPlanners('pilgrim-id', { page: 1, limit: 10 });

  assert.equal(result.planners.length, 2);
  assert.deepEqual(syncCalls, ['planner-owned', 'planner-joined-1']);
  assert.equal(result.pagination.total, 2);
  assert.equal(result.pagination.totalPages, 1);
  assert.equal(result.planners[0].viewer_join_status, 'owner');
  assert.equal(result.planners[0].is_read_only, false);
  assert.equal(result.planners[1].viewer_join_status, 'joined');
  assert.equal(result.planners[1].viewer_deposit_status, 'paid');
  assert.equal(result.planners[1].is_read_only, false);
  assert.deepEqual(state.plannerMemberFindAllCalls[0].where, {
    user_id: 'pilgrim-id',
  });
});

test('UTCID02: getUserPlanners applies second-page pagination values correctly', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerMemberFindAll: async () => [{ planner_id: 'planner-joined-1', join_status: 'joined', deposit_status: 'paid' }],
    plannerFindAndCountAll: async () => ({
      rows: [
        createPlannerRow({
          id: 'planner-page-2',
          user_id: 'other-owner-id',
          name: 'Page 2 Planner',
          start_date: '2026-04-18',
          end_date: '2026-04-19',
          number_of_people: 2,
          transportation: 'car',
          deposit_amount: 100000,
          penalty_percentage: 10,
          status: 'planning',
        }),
      ],
      count: 3,
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getUserPlanners('pilgrim-id', { page: 2, limit: 1 });

  assert.equal(state.plannerFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.plannerFindAndCountAllCalls[0].offset, 1);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.limit, 1);
  assert.equal(result.pagination.totalPages, 3);
});

test('UTCID03: getUserPlanners still returns owned planners when user has not joined any planner', async () => {
  const { PlannerService } = loadPlannerService({
    plannerMemberFindAll: async () => [],
    plannerFindAndCountAll: async () => ({
      rows: [
        createPlannerRow({
          id: 'planner-owned-only',
          user_id: 'pilgrim-id',
          name: 'Owned Only Planner',
          start_date: null,
          end_date: null,
          number_of_people: 1,
          transportation: null,
          deposit_amount: 0,
          penalty_percentage: 0,
          status: 'planning',
        }),
      ],
      count: 1,
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getUserPlanners('pilgrim-id');

  assert.equal(result.planners.length, 1);
  assert.equal(result.planners[0].id, 'planner-owned-only');
});

test('UTCID04A: getUserPlanners returns read-only metadata for dropped-out member with financial involvement', async () => {
  const { PlannerService } = loadPlannerService({
    plannerMemberFindAll: async () => ([
      { planner_id: 'planner-dropped-out', join_status: 'dropped_out', deposit_status: 'penalized' },
    ]),
    plannerFindAndCountAll: async () => ({
      rows: [
        createPlannerRow({
          id: 'planner-dropped-out',
          user_id: 'other-owner-id',
          name: 'Former Member Planner',
          start_date: '2026-04-20',
          end_date: '2026-04-21',
          number_of_people: 4,
          transportation: 'bus',
          deposit_amount: 200000,
          penalty_percentage: 20,
          status: 'ongoing',
        }),
      ],
      count: 1,
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getUserPlanners('pilgrim-id');

  assert.equal(result.planners.length, 1);
  assert.equal(result.planners[0].viewer_join_status, 'dropped_out');
  assert.equal(result.planners[0].viewer_deposit_status, 'penalized');
  assert.equal(result.planners[0].is_read_only, true);
});

test('UTCID04: getUserPlanners returns empty list when user has no planner', async () => {
  const { PlannerService } = loadPlannerService({
    plannerMemberFindAll: async () => [],
    plannerFindAndCountAll: async () => ({
      rows: [],
      count: 0,
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getUserPlanners('pilgrim-id', { page: 1, limit: 10 });

  assert.deepEqual(result.planners, []);
  assert.equal(result.pagination.total, 0);
  assert.equal(result.pagination.totalPages, 0);
});

test('UTCID05: getUserPlanners logs and rethrows database errors', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerMemberFindAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PlannerService.getUserPlanners('pilgrim-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get user planners error:');
});
