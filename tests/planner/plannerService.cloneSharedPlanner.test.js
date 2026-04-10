const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createSourcePlanner(data = {}) {
  return {
    id: 'source-planner-id',
    is_active: true,
    status: 'completed',
    name: 'Original Journey',
    start_date: '2026-05-10',
    end_date: '2026-05-12',
    number_of_people: 3,
    transportation: 'bus',
    items: [
      {
        id: 'source-item-2',
        site_id: 'site-2',
        leg_number: 2,
        order_index: 1,
        note: 'Day 2 stop',
        nearby_amenity_ids: ['amenity-2'],
        estimated_time: '10:00',
        rest_duration: '45m',
        travel_time_minutes: 50,
      },
      {
        id: 'source-item-1',
        site_id: 'site-1',
        leg_number: 1,
        order_index: 1,
        note: 'Day 1 stop',
        nearby_amenity_ids: ['amenity-1'],
        estimated_time: '09:00',
        rest_duration: '30m',
        travel_time_minutes: 25,
      },
    ],
    ...data,
  };
}

test('UTCID01: cloneSharedPlanner clones a shared completed journey with explicit overrides', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner(),
    postFindOne: async () => ({
      id: 'shared-post-id',
      user_id: 'source-owner-id',
      created_at: new Date('2026-05-20T00:00:00.000Z'),
    }),
    plannerCreate: async (data) => ({
      id: 'cloned-planner-id',
      ...data,
    }),
  });

  PlannerService.validatePlannerCreationBasics = async (userId, plannerData) => ({
    name: plannerData.name,
    start_date: plannerData.start_date,
    end_date: plannerData.end_date,
    number_of_people: plannerData.number_of_people,
    transportation: plannerData.transportation,
  });
  PlannerService.getPlannerById = async (plannerId, userId) => ({
    id: plannerId,
    user_id: userId,
    name: 'New Journey',
    status: 'planning',
  });

  const result = await PlannerService.cloneSharedPlanner('user-id', 'source-planner-id', {
    name: '  New Journey  ',
    start_date: '2026-06-01',
    end_date: '2026-06-03',
    number_of_people: 2,
    transportation: 'car',
  });

  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
  assert.deepEqual(state.plannerCreateCalls[0].data, {
    user_id: 'user-id',
    name: 'New Journey',
    start_date: '2026-06-01',
    end_date: '2026-06-03',
    number_of_people: 2,
    transportation: 'car',
    deposit_amount: 0,
    penalty_percentage: 0,
    status: 'planning',
    is_locked: false,
    edit_lock_at: null,
    started_at: null,
    completed_at: null,
  });
  assert.deepEqual(state.plannerMemberCreateCalls[0].data, {
    planner_id: 'cloned-planner-id',
    user_id: 'user-id',
    join_status: 'joined',
    deposit_status: null,
  });
  assert.equal(state.plannerItemBulkCreateCalls[0].rows.length, 2);
  assert.deepEqual(state.plannerItemBulkCreateCalls[0].rows[0], {
    planner_id: 'cloned-planner-id',
    site_id: 'site-1',
    leg_number: 1,
    order_index: 1,
    event_id: null,
    status: 'upcoming',
    note: 'Day 1 stop',
    skip_reason: null,
    skipped_at: null,
    nearby_amenity_ids: ['amenity-1'],
    estimated_time: '09:00',
    rest_duration: '30m',
    travel_time_minutes: 25,
  });
  assert.deepEqual(result, {
    id: 'cloned-planner-id',
    user_id: 'user-id',
    name: 'New Journey',
    status: 'planning',
    cloned_from: {
      planner_id: 'source-planner-id',
      post_id: 'shared-post-id',
      name: 'Original Journey',
      start_date: '2026-05-10',
      end_date: '2026-05-12',
      number_of_people: 3,
    },
  });
});

test('UTCID02: cloneSharedPlanner uses default clone name and generated dates when overrides are omitted', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner({
      name: 'La Vang Pilgrimage',
      number_of_people: 1,
    }),
    postFindOne: async () => ({
      id: 'shared-post-id-2',
      user_id: 'source-owner-id',
      created_at: new Date('2026-05-20T00:00:00.000Z'),
    }),
    plannerCreate: async (data) => ({
      id: 'cloned-planner-id-2',
      ...data,
    }),
  });

  PlannerService.getDefaultCloneStartDate = () => '2026-06-10';
  PlannerService.validatePlannerCreationBasics = async (userId, plannerData) => ({
    name: plannerData.name,
    start_date: plannerData.start_date,
    end_date: plannerData.end_date,
    number_of_people: plannerData.number_of_people,
    transportation: plannerData.transportation,
  });
  PlannerService.getPlannerById = async (plannerId) => ({
    id: plannerId,
    name: 'La Vang Pilgrimage (Copy)',
    status: 'planning',
  });

  const result = await PlannerService.cloneSharedPlanner('user-id', 'source-planner-id');

  assert.equal(state.plannerCreateCalls[0].data.name, 'La Vang Pilgrimage (Copy)');
  assert.equal(state.plannerCreateCalls[0].data.start_date, '2026-06-10');
  assert.equal(state.plannerCreateCalls[0].data.end_date, '2026-06-12');
  assert.equal(state.plannerCreateCalls[0].data.number_of_people, 1);
  assert.equal(result.cloned_from.post_id, 'shared-post-id-2');
});

test('UTCID03: cloneSharedPlanner throws when source planner does not exist or is inactive', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
    postFindOne: async () => null,
  });

  await assert.rejects(
    PlannerService.cloneSharedPlanner('user-id', 'missing-source-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Clone shared planner error:');
});

test('UTCID04: cloneSharedPlanner throws when source journey is not publicly available for cloning', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner(),
    postFindOne: async () => null,
  });

  await assert.rejects(
    PlannerService.cloneSharedPlanner('user-id', 'source-planner-id'),
    { message: 'Journey is not available for community cloning' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Clone shared planner error:');
});

test('UTCID05: cloneSharedPlanner throws when shared journey has no planner items', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner({
      items: [],
    }),
    postFindOne: async () => ({
      id: 'shared-post-id',
      user_id: 'source-owner-id',
      created_at: new Date('2026-05-20T00:00:00.000Z'),
    }),
  });

  await assert.rejects(
    PlannerService.cloneSharedPlanner('user-id', 'source-planner-id'),
    { message: 'Shared journey has no planner items' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Clone shared planner error:');
});

test('UTCID06: cloneSharedPlanner throws when clone duration is shorter than source journey', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner(),
    postFindOne: async () => ({
      id: 'shared-post-id',
      user_id: 'source-owner-id',
      created_at: new Date('2026-05-20T00:00:00.000Z'),
    }),
  });

  await assert.rejects(
    PlannerService.cloneSharedPlanner('user-id', 'source-planner-id', {
      start_date: '2026-06-01',
      end_date: '2026-06-02',
    }),
    (error) => {
      assert.equal(error.message, 'Clone duration is shorter than source journey');
      assert.equal(error.requiredDays, 3);
      assert.equal(error.minimumEndDate, '2026-06-03');
      return true;
    }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Clone shared planner error:');
});

test('UTCID07: cloneSharedPlanner rolls back when planner creation validation or insert fails', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createSourcePlanner(),
    postFindOne: async () => ({
      id: 'shared-post-id',
      user_id: 'source-owner-id',
      created_at: new Date('2026-05-20T00:00:00.000Z'),
    }),
    plannerCreate: async () => {
      throw new Error('Database unavailable');
    },
  });

  PlannerService.validatePlannerCreationBasics = async (userId, plannerData) => ({
    name: plannerData.name,
    start_date: plannerData.start_date,
    end_date: plannerData.end_date,
    number_of_people: plannerData.number_of_people,
    transportation: plannerData.transportation,
  });

  await assert.rejects(
    PlannerService.cloneSharedPlanner('user-id', 'source-planner-id', {
      start_date: '2026-06-01',
      end_date: '2026-06-03',
    }),
    { message: 'Database unavailable' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Clone shared planner error:');
});
