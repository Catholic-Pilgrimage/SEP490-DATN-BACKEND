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

function createPlannerItemRecord(data = {}, updateCalls = []) {
  const record = {
    id: 'item-id',
    planner_id: 'planner-id',
    site_id: 'site-1',
    event_id: null,
    leg_number: 1,
    order_index: 1,
    status: 'upcoming',
    note: 'Old note',
    nearby_amenity_ids: [],
    estimated_time: '09:00',
    rest_duration: '30m',
    travel_time_minutes: 15,
    site: createSite(),
    update: async (values) => {
      updateCalls.push(values);
      Object.assign(record, values);
      return record;
    },
    ...data,
  };

  return record;
}

test('UTCID01: updatePlannerItem updates note and nearby amenities successfully', async () => {
  const itemUpdateCalls = [];
  const item = createPlannerItemRecord({}, itemUpdateCalls);

  const { PlannerService, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async (_itemId, options) => {
      if (options?.transaction) {
        return item;
      }
      return createPlannerItemRecord({
        note: 'Updated note',
        nearby_amenity_ids: ['nearby-1', 'nearby-2'],
      });
    },
  });

  PlannerService.getPlannerState = async () => ({ editLocked: false });

  const result = await PlannerService.updatePlannerItem('planner-id', 'owner-id', 'item-id', {
    note: 'Updated note',
    nearby_amenity_ids: ['nearby-1', 'nearby-1', 'nearby-2'],
  });

  assert.deepEqual(itemUpdateCalls[0], {
    note: 'Updated note',
    nearby_amenity_ids: ['nearby-1', 'nearby-2'],
  });
  assert.equal(result.note, 'Updated note');
  assert.deepEqual(result.nearby_amenity_ids, ['nearby-1', 'nearby-2']);
});

test('UTCID02: updatePlannerItem updates estimated time, recalculates subsequent items, and notifies ongoing members', async () => {
  const itemUpdateCalls = [];
  const nextItemUpdateCalls = [];
  const currentItem = createPlannerItemRecord({
    event_id: 'event-id',
    status: 'rejected',
    order_index: 1,
    estimated_time: '09:00',
    rest_duration: '30m',
  }, itemUpdateCalls);
  const nextItem = createPlannerItemRecord({
    id: 'next-item-id',
    order_index: 2,
    estimated_time: '11:00',
    rest_duration: '30m',
    update: async (values) => {
      nextItemUpdateCalls.push(values);
      return values;
    },
  });

  let findByPkCall = 0;
  let findOneCall = 0;

  const { PlannerService, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'ongoing',
    }),
    plannerItemFindByPk: async () => {
      findByPkCall += 1;
      if (findByPkCall === 1) {
        return currentItem;
      }
      if (findByPkCall === 2) {
        return currentItem;
      }
      return createPlannerItemRecord({
        event_id: 'event-id',
        status: 'rejected',
        estimated_time: '10:30',
        rest_duration: '45m',
      });
    },
    plannerItemFindOne: async () => {
      findOneCall += 1;
      return null;
    },
    plannerItemFindAll: async () => [nextItem],
    eventFindByPk: async () => ({
      id: 'event-id',
      name: 'Holy Mass',
      start_date: '2026-04-10',
      end_date: '2026-04-10',
      start_time: '10:30:00',
      end_time: '12:00:00',
    }),
  });

  PlannerService.getPlannerState = async () => ({ editLocked: false });
  PlannerService.validateEventTimingForPlannerItem = () => ({ warning: 'Event timing adjusted' });
  PlannerService.getNextUpcomingPlannerItem = async () => ({
    site: { name: 'Next Stop' },
    estimated_time: '12:00',
  });
  const notifyCalls = [];
  PlannerService.notifyOngoingPlannerMembers = async (planner, type, data, options) => {
    notifyCalls.push({ planner, type, data, options });
    return [];
  };

  const result = await PlannerService.updatePlannerItem('planner-id', 'owner-id', 'item-id', {
    estimated_time: '10:30',
    rest_duration: '45m',
  });

  assert.deepEqual(itemUpdateCalls[0], {
    rest_duration: '45m',
    estimated_time: '10:30',
  });
  assert.deepEqual(nextItemUpdateCalls[0], { estimated_time: '01:00' });
  assert.equal(result.warning, 'Event timing adjusted');
  assert.equal(notifyCalls.length, 1);
  assert.equal(notifyCalls[0].type, 'planner_schedule_changed');
});

test('UTCID03: updatePlannerItem throws planner not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.updatePlannerItem('missing-planner-id', 'owner-id', 'item-id', { note: 'Updated' }),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});

test('UTCID04: updatePlannerItem throws forbidden when requester is not planner owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.updatePlannerItem('planner-id', 'other-user-id', 'item-id', { note: 'Updated' }),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});

test('UTCID05: updatePlannerItem throws when planner is locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({ editLocked: true });

  await assert.rejects(
    PlannerService.updatePlannerItem('planner-id', 'owner-id', 'item-id', { note: 'Updated' }),
    { message: 'Planner is locked' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});

test('UTCID06: updatePlannerItem throws when item does not exist', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => null,
  });

  PlannerService.getPlannerState = async () => ({ editLocked: false });

  await assert.rejects(
    PlannerService.updatePlannerItem('planner-id', 'owner-id', 'missing-item-id', { note: 'Updated' }),
    { message: 'Item not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});

test('UTCID07: updatePlannerItem throws when item is already visited', async () => {
  const item = createPlannerItemRecord({ status: 'visited' });

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
  });

  PlannerService.getPlannerState = async () => ({ editLocked: false });

  await assert.rejects(
    PlannerService.updatePlannerItem('planner-id', 'owner-id', 'item-id', { note: 'Updated' }),
    { message: 'Cannot update visited site' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});

test('UTCID08: updatePlannerItem throws when item does not belong to planner', async () => {
  const item = createPlannerItemRecord({ planner_id: 'another-planner-id' });

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
  });

  PlannerService.getPlannerState = async () => ({ editLocked: false });

  await assert.rejects(
    PlannerService.updatePlannerItem('planner-id', 'owner-id', 'item-id', { note: 'Updated' }),
    { message: 'Item does not belong to this planner' }
  );

  assert.equal(state.errorLogs[0][0], 'Update planner item error:');
});
