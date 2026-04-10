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
    number_of_people: 2,
    transportation: 'bus',
    deposit_amount: 300000,
    penalty_percentage: 15,
    status: 'planning',
    is_active: true,
    ...data,
  });
}

function createSite(data = {}) {
  return {
    id: 'site-1',
    name: 'La Vang Shrine',
    code: 'SITE-001',
    province: 'Hue',
    latitude: 16.74,
    longitude: 107.21,
    cover_image: 'cover.jpg',
    patron_saint: 'Our Lady of La Vang',
    opening_hours: null,
    ...data,
  };
}

function createPlannerItemRow(data = {}) {
  return {
    id: 'planner-item-id',
    planner_id: 'planner-id',
    site_id: 'site-1',
    event_id: null,
    leg_number: 1,
    order_index: 1,
    status: 'upcoming',
    note: null,
    skip_reason: null,
    skipped_at: null,
    nearby_amenity_ids: [],
    estimated_time: '09:00',
    rest_duration: '30m',
    travel_time_minutes: null,
    checkin_latitude: null,
    checkin_longitude: null,
    checkin_distance_meters: null,
    checked_in_at: null,
    site: createSite(),
    created_at: new Date('2026-04-07T00:00:00.000Z'),
    updated_at: new Date('2026-04-07T00:00:00.000Z'),
    ...data,
  };
}

test('UTCID01: addPlannerItem creates first site item successfully and filters duplicate nearby places', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    siteFindByPk: async () => createSite(),
    nearbyPlaceFindAll: async () => [{ id: 'nearby-1' }],
    plannerItemMax: async () => null,
    plannerItemCreate: async (data) => ({ id: 'item-1', ...data }),
    plannerItemFindByPk: async () => createPlannerItemRow({
      id: 'item-1',
      nearby_amenity_ids: ['nearby-1'],
      estimated_time: '09:00',
      rest_duration: '30m',
    }),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
  });

  const result = await PlannerService.addPlannerItem('planner-id', 'owner-id', {
    site_id: 'site-1',
    leg_number: 1,
    rest_duration: '30m',
    nearby_amenity_ids: ['nearby-1', 'nearby-1', 'nearby-missing'],
  });

  assert.equal(result.id, 'item-1');
  assert.equal(result.estimated_time, '09:00');
  assert.deepEqual(state.plannerItemCreateCalls[0].data.nearby_amenity_ids, ['nearby-1']);
  assert.equal(state.warnLogs[0][0], 'Invalid nearby_amenity_ids: nearby-missing');
});

test('UTCID02: addPlannerItem creates event-based planner item with auto-calculated leg and timing', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    eventFindByPk: async () => ({
      id: 'event-id',
      name: 'Holy Mass',
      status: 'approved',
      is_active: true,
      site_id: 'site-1',
      start_date: '2026-04-11',
      end_date: '2026-04-11',
      start_time: '14:00:00',
      end_time: '16:30:00',
    }),
    siteFindByPk: async () => createSite(),
    plannerItemFindAll: async () => [{ leg_number: 1 }],
    plannerItemMax: async () => null,
    plannerItemCreate: async (data) => ({ id: 'item-2', ...data }),
    plannerItemFindByPk: async () => createPlannerItemRow({
      id: 'item-2',
      event_id: 'event-id',
      leg_number: 2,
      estimated_time: '14:00',
      rest_duration: '2h30m',
      note: 'Sự kiện: Holy Mass',
    }),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
  });

  const result = await PlannerService.addPlannerItem('planner-id', 'owner-id', {
    event_id: 'event-id',
  });

  assert.equal(state.plannerItemCreateCalls[0].data.leg_number, 2);
  assert.equal(state.plannerItemCreateCalls[0].data.estimated_time, '14:00');
  assert.equal(state.plannerItemCreateCalls[0].data.rest_duration, '2h30m');
  assert.equal(result.event_info.id, 'event-id');
  assert.equal(result.leg_number, 2);
});

test('UTCID03: addPlannerItem throws when event does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    eventFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.addPlannerItem('planner-id', 'owner-id', { event_id: 'missing-event-id' }),
    { message: 'Event not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Add planner item error:');
});

test('UTCID04: addPlannerItem throws forbidden when requester is not planner owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    siteFindByPk: async () => createSite(),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
  });

  await assert.rejects(
    PlannerService.addPlannerItem('planner-id', 'other-user-id', {
      site_id: 'site-1',
      leg_number: 1,
      rest_duration: '30m',
    }),
    { message: 'Forbidden' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Add planner item error:');
});

test('UTCID05: addPlannerItem throws when planner is locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: true,
  });

  await assert.rejects(
    PlannerService.addPlannerItem('planner-id', 'owner-id', {
      site_id: 'site-1',
      leg_number: 1,
      rest_duration: '30m',
    }),
    { message: 'Planner is locked' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Add planner item error:');
});

test('UTCID06: addPlannerItem throws when site does not exist', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    siteFindByPk: async () => null,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
  });

  await assert.rejects(
    PlannerService.addPlannerItem('planner-id', 'owner-id', {
      site_id: 'missing-site',
      leg_number: 1,
      rest_duration: '30m',
    }),
    { message: 'Site not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Add planner item error:');
});

test('UTCID07: addPlannerItem rejects consecutive duplicate site in same day', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    siteFindByPk: async () => createSite(),
    plannerItemFindOne: async () => ({
      id: 'previous-item-id',
      site_id: 'site-1',
      estimated_time: '10:00',
      rest_duration: '30m',
      site: createSite(),
    }),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
  });

  await assert.rejects(
    PlannerService.addPlannerItem('planner-id', 'owner-id', {
      site_id: 'site-1',
      leg_number: 1,
      rest_duration: '30m',
      estimated_time: '11:00',
    }),
    { message: 'Consecutive site not allowed' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Add planner item error:');
});
