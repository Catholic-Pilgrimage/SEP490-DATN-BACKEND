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

test('UTCID01: completeItem marks item visited successfully when all members checked in', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
      { user_id: 'member-1' },
    ],
    plannerItemFindAll: async () => [
      { status: 'visited' },
      { status: 'upcoming' },
    ],
  });

  const result = await CheckinService.completeItem('owner-id', 'item-2');

  assert.equal(result.message, 'Đã hoàn thành điểm đến');
  assert.deepEqual(result.stats, { checked_in: 2, missed: 0 });
  assert.equal(result.skip_reason, null);
  assert.equal(state.plannerItemUpdateCalls.length, 1);
  assert.equal(state.plannerItemUpdateCalls[0].values.status, 'visited');
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
});

test('UTCID02: completeItem returns confirmation payload when some members are missing', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }, { user_id: 'member-2' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
      { user_id: 'member-1' },
    ],
    userFindAll: async () => [
      { id: 'member-2', full_name: 'Member Two', avatar_url: 'avatar-2' },
    ],
  });

  const result = await CheckinService.completeItem('owner-id', 'item-2');

  assert.equal(result.requires_confirmation, true);
  assert.equal(result.site.name, 'La Vang');
  assert.deepEqual(result.stats, { checked_in: 2, missed: 1 });
  assert.equal(result.skip_reason_required, true);
  assert.equal(result.missing_members.length, 1);
  assert.equal(result.missing_members[0].user_id, 'member-2');
  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID03: completeItem records missed members after confirmation with skip reason', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }, { user_id: 'member-2' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
      { user_id: 'member-1' },
    ],
    plannerItemFindAll: async () => [
      { status: 'visited' },
      { status: 'upcoming' },
    ],
  });

  const result = await CheckinService.completeItem('owner-id', 'item-2', ' Traffic delay ', {
    confirmMissed: true,
  });

  assert.equal(result.skip_reason, 'Traffic delay');
  assert.deepEqual(result.stats, { checked_in: 2, missed: 1 });
  assert.equal(state.userCheckinBulkCreateCalls.length, 1);
  assert.equal(state.userCheckinBulkCreateCalls[0].rows.length, 1);
  assert.equal(state.userCheckinUpdateCalls.length, 1);
  assert.equal(state.notificationCreateCalls.length, 1);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_item_missed');
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID04: completeItem keeps planner ongoing until day closure when final item is finished', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
      { user_id: 'member-1' },
    ],
    plannerItemFindAll: async () => [
      { status: 'visited' },
      { status: 'visited' },
    ],
  });

  const result = await CheckinService.completeItem('owner-id', 'item-2');

  assert.equal(result.message, 'Đã hoàn thành điểm đến');
  assert.equal(state.plannerUpdateCalls.length, 0);
  assert.equal(state.antiFraudCalls.length, 0);
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID05: completeItem throws when planner item does not exist', async () => {
  const { CheckinService, state } = loadCheckinService({
    plannerItemFindByPk: async () => null,
  });

  await assert.rejects(
    CheckinService.completeItem('owner-id', 'missing-item'),
    { message: 'Planner item not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID06: completeItem throws when requester is not the planner owner', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
  });

  await assert.rejects(
    CheckinService.completeItem('other-user-id', 'item-2'),
    { message: 'Only the Leader can perform this action' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID07: completeItem throws when planner is not ongoing', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord, {
      planner: createPlannerRecord(createUpdatableRecord, { status: 'planning' }),
    }),
  });

  await assert.rejects(
    CheckinService.completeItem('owner-id', 'item-2'),
    { message: 'This plan is not active, cannot update site status' }
  );
});

test('UTCID08: completeItem throws when owner has not checked in yet', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [
      { user_id: 'member-1' },
    ],
  });

  await assert.rejects(
    CheckinService.completeItem('owner-id', 'item-2'),
    { message: 'Owner must check in before marking site as visited' }
  );
});

test('UTCID09: completeItem throws when large group has no other member checked in', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }, { user_id: 'member-2' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
    ],
  });

  await assert.rejects(
    CheckinService.completeItem('owner-id', 'item-2'),
    { message: 'At least one other member must check in before marking site as visited' }
  );
});

test('UTCID10: completeItem throws when confirmation is given without skip reason', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async () => createPlannerItemRecord(createUpdatableRecord),
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }, { user_id: 'member-2' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id' },
      { user_id: 'member-1' },
    ],
  });

  await assert.rejects(
    CheckinService.completeItem('owner-id', 'item-2', '   ', { confirmMissed: true }),
    { message: 'Skip reason is required' }
  );
});
