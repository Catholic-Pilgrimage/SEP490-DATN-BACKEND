const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCheckinService } = require('./_checkinTestHelper');

function createPlannerRecord(createUpdatableRecord, data = {}) {
  return createUpdatableRecord('plannerUpdateCalls', {
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    status: 'ongoing',
    ...data,
  });
}

function createPlannerItemRecord(createUpdatableRecord, data = {}) {
  const planner = data.planner || createPlannerRecord(createUpdatableRecord);
  return createUpdatableRecord('plannerItemUpdateCalls', {
    id: 'item-2',
    planner_id: planner.id,
    status: 'upcoming',
    site: {
      id: 'site-2',
      name: 'La Vang',
    },
    planner,
    ...data,
  });
}

test('UTCID01: skipItemByOwner skips item successfully and notifies members when next stop exists', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerItemFindAll: async () => [{ id: 'item-2', leg_number: 1, order_index: 2 }],
    userCheckinCount: async () => 0,
    getCheckinStats: async () => ({ totalItems: 3, checkedInItems: 1, visitedCount: 1 }),
    getNextUpcomingPlannerItem: async () => ({
      id: 'item-3',
      site: { name: 'Tra Kieu' },
    }),
  });

  const result = await CheckinService.skipItemByOwner('owner-id', 'item-2', ' Traffic issue ');

  assert.equal(result.message, 'Đã đánh dấu bỏ qua địa điểm này cho toàn đoàn');
  assert.equal(state.plannerItemUpdateCalls.length, 1);
  assert.equal(state.plannerItemUpdateCalls[0].values.status, 'skipped');
  assert.equal(state.plannerItemUpdateCalls[0].values.skip_reason, 'Traffic issue');
  assert.equal(state.plannerServiceNotifyCalls.length, 1);
  assert.equal(state.plannerServiceNotifyCalls[0].type, 'planner_item_skipped');
  assert.equal(state.plannerServiceNotifyCalls[0].data.nextSiteName, 'Tra Kieu');
  assert.equal(state.plannerUpdateCalls.length, 0);
});

test('UTCID02: skipItemByOwner marks the last item skipped without auto-cancelling planner', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerItemFindAll: async () => [{ id: 'item-2', leg_number: 1, order_index: 2 }],
    userCheckinCount: async () => 0,
    getCheckinStats: async () => ({ totalItems: 2, checkedInItems: 2, visitedCount: 0 }),
    getNextUpcomingPlannerItem: async () => null,
  });

  const result = await CheckinService.skipItemByOwner('owner-id', 'item-2', ' Closed site ');

  assert.equal(result.message, 'Đã đánh dấu bỏ qua địa điểm này cho toàn đoàn');
  assert.equal(state.plannerServiceNotifyCalls.length, 1);
  assert.equal(state.plannerServiceNotifyCalls[0].type, 'planner_item_skipped_last');
  assert.equal(state.plannerUpdateCalls.length, 0);
});

test('UTCID03: skipItemByOwner throws when planner item does not exist', async () => {
  const { CheckinService } = loadCheckinService({
    plannerItemFindByPk: async () => null,
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('owner-id', 'missing-item', 'Reason'),
    { message: 'Planner item not found' }
  );
});

test('UTCID04: skipItemByOwner throws when requester is not planner owner', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('other-user-id', 'item-2', 'Reason'),
    { message: 'Only the Leader can perform this action' }
  );
});

test('UTCID05: skipItemByOwner throws when planner is already completed', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord, {
      planner: createPlannerRecord(createUpdatableRecord, { status: 'completed' }),
    }),
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('owner-id', 'item-2', 'Reason'),
    { message: 'The plan has been completed, cannot change site status' }
  );
});

test('UTCID06: skipItemByOwner throws when planner item is already visited or skipped', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord, {
      status: 'visited',
    }),
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('owner-id', 'item-2', 'Reason'),
    { message: 'This site is already closed, cannot change' }
  );
});

test('UTCID07: skipItemByOwner throws when a member has already checked in', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerItemFindAll: async () => [{ id: 'item-2', leg_number: 1, order_index: 2 }],
    userCheckinCount: async () => 1,
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('owner-id', 'item-2', 'Reason'),
    { message: 'Cannot skip site after a member has checked in' }
  );
});

test('UTCID08: skipItemByOwner throws when skip reason is missing', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerItemFindAll: async () => [{ id: 'item-2', leg_number: 1, order_index: 2 }],
    userCheckinCount: async () => 0,
  });

  await assert.rejects(
    CheckinService.skipItemByOwner('owner-id', 'item-2', '   '),
    { message: 'Skip reason is required' }
  );
});
