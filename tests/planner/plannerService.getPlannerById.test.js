const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerItem(data = {}) {
  return {
    id: 'item-id',
    planner_id: 'planner-id',
    site_id: 'site-id',
    event_id: null,
    leg_number: 1,
    order_index: 1,
    status: 'upcoming',
    note: null,
    skip_reason: null,
    skipped_at: null,
    nearby_amenity_ids: [],
    estimated_time: '08:00',
    rest_duration: '1 hour',
    travel_time_minutes: 30,
    checkin_latitude: null,
    checkin_longitude: null,
    checkin_distance_meters: null,
    checked_in_at: null,
    site: {
      id: 'site-id',
      name: 'La Vang Shrine',
      code: 'SITE-001',
      province: 'Hue',
      latitude: 16.74,
      longitude: 107.21,
      cover_image: 'cover.jpg',
      patron_saint: 'Our Lady of La Vang',
    },
    created_at: new Date('2026-04-07T00:00:00.000Z'),
    updated_at: new Date('2026-04-07T00:00:00.000Z'),
    ...data,
  };
}

function createPlannerRecord(factory, data = {}) {
  const planner = factory({
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    start_date: null,
    end_date: null,
    number_of_people: 1,
    transportation: 'bus',
    deposit_amount: 0,
    penalty_percentage: 0,
    status: 'planning',
    is_locked: false,
    share_token: 'share-token',
    qr_code_url: 'qr-code-url',
    owner: {
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
      avatar_url: null,
    },
    items: [],
    ...data,
  });

  planner.owner = planner.owner || {
    id: 'owner-id',
    full_name: 'Owner User',
    email: 'owner@example.com',
    avatar_url: null,
  };
  planner.items = planner.items || [];
  return planner;
}

test('UTCID01: getPlannerById returns planner detail for owner with grouped itinerary items', async () => {
  const { PlannerService, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      items: [
        createPlannerItem(),
        createPlannerItem({
          id: 'item-id-2',
          leg_number: 2,
          order_index: 1,
          estimated_time: '10:00',
          rest_duration: '30 minutes',
        }),
      ],
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getPlannerById('planner-id', 'owner-id');

  assert.equal(result.id, 'planner-id');
  assert.equal(result.owner.email, 'owner@example.com');
  assert.equal(result.items_by_day['1'].length, 1);
  assert.equal(result.items_by_day['2'].length, 1);
  assert.equal(result.items_by_day['1'][0].estimated_departure_time, '09:00');
});

test('UTCID02: getPlannerById allows joined member to access planner detail', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerMemberFindOne: async () => ({
      id: 'member-id',
      planner_id: 'planner-id',
      user_id: 'joined-user-id',
      join_status: 'joined',
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getPlannerById('planner-id', 'joined-user-id');

  assert.equal(result.id, 'planner-id');
  assert.equal(result.viewer_join_status, 'joined');
  assert.equal(result.viewer_deposit_status, null);
  assert.equal(result.is_read_only, false);
  assert.deepEqual(state.plannerMemberFindOneCalls[0].where, {
    planner_id: 'planner-id',
    user_id: 'joined-user-id',
  });
});

test('UTCID03: getPlannerById skips membership check when accessed without authenticated user context', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getPlannerById('planner-id');

  assert.equal(result.id, 'planner-id');
  assert.equal(state.plannerMemberFindOneCalls.length, 0);
});

test('UTCID04: getPlannerById throws not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.getPlannerById('missing-planner-id', 'owner-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get planner by ID error:');
});

test('UTCID05: getPlannerById throws forbidden for non-member non-owner access', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerMemberFindOne: async () => null,
  });

  PlannerService.syncPlannerLockState = async () => {};

  await assert.rejects(
    PlannerService.getPlannerById('planner-id', 'stranger-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.plannerMemberFindOneCalls.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get planner by ID error:');
});

test('UTCID05A: getPlannerById allows dropped-out member with refunded deposit to read in read-only mode', async () => {
  const { PlannerService, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'ongoing',
    }),
    plannerMemberFindOne: async () => ({
      id: 'member-id',
      planner_id: 'planner-id',
      user_id: 'former-member-id',
      join_status: 'dropped_out',
      deposit_status: 'refunded',
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};

  const result = await PlannerService.getPlannerById('planner-id', 'former-member-id');

  assert.equal(result.id, 'planner-id');
  assert.equal(result.viewer_join_status, 'dropped_out');
  assert.equal(result.viewer_deposit_status, 'refunded');
  assert.equal(result.is_read_only, true);
});

test('UTCID06: getPlannerById auto-starts eligible planner and returns ongoing status', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      start_date: '2026-04-08',
      end_date: '2026-04-10',
      number_of_people: 2,
    }),
  });

  PlannerService.syncPlannerLockState = async () => {};
  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    finalLocked: true,
    isRealGroup: true,
    firstInviteAt: new Date('2026-04-07T08:00:00.000Z'),
    editLockAvailableAt: new Date('2026-04-07T20:00:00.000Z'),
    canSetEditLockAt: false,
  });
  PlannerService.shouldPlannerBeOngoing = async () => true;
  PlannerService.markPlannerAsOngoing = async (planner) => {
    planner.status = 'ongoing';
    planner.started_at = new Date('2026-04-07T09:00:00.000Z');
  };

  const result = await PlannerService.getPlannerById('planner-id', 'owner-id');

  assert.equal(result.status, 'ongoing');
  assert.equal(result.first_invite_at, undefined);
  assert.equal(state.infoLogs.length, 1);
  assert.match(state.infoLogs[0][0], /auto-updated status from 'planning' to 'ongoing'/);
});

test('UTCID07: getPlannerById returns planner lock metadata when planner remains in planning state', async () => {
  const { PlannerService, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      start_date: '2026-04-15',
      end_date: '2026-04-17',
      number_of_people: 3,
      status: 'planning',
    }),
  });

  const firstInviteAt = new Date('2026-04-07T09:00:00.000Z');
  const editLockAvailableAt = new Date('2026-04-07T21:00:00.000Z');

  PlannerService.syncPlannerLockState = async () => {};
  PlannerService.getPlannerState = async () => ({
    scheduleComplete: true,
    finalLocked: true,
    isRealGroup: true,
    firstInviteAt,
    editLockAvailableAt,
    canSetEditLockAt: true,
  });
  PlannerService.shouldPlannerBeOngoing = async () => false;

  const result = await PlannerService.getPlannerById('planner-id', 'owner-id');

  assert.equal(result.status, 'planning');
  assert.equal(result.first_invite_at, firstInviteAt);
  assert.equal(result.edit_lock_available_at, editLockAvailableAt);
  assert.equal(result.can_set_edit_lock_at, true);
});
