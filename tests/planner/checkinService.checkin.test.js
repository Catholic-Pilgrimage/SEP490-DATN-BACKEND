const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCheckinService } = require('./_checkinTestHelper');

function createPlannerRecord(createUpdatableRecord, data = {}) {
  return createUpdatableRecord('plannerUpdateCalls', {
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    status: 'ongoing',
    end_date: '2026-04-12',
    started_at: new Date('2026-04-08T08:00:00.000Z'),
    ...data,
  });
}

function createPlannerItemRecord(createUpdatableRecord, data = {}) {
  const planner = data.planner || createPlannerRecord(createUpdatableRecord);
  return createUpdatableRecord('plannerItemUpdateCalls', {
    id: 'item-2',
    planner_id: planner.id,
    site_id: 'site-2',
    status: 'upcoming',
    leg_number: 1,
    order_index: 2,
    site: {
      id: 'site-2',
      name: 'La Vang',
      latitude: '16.7412',
      longitude: '107.1854',
    },
    planner,
    ...data,
  });
}

function createPreviousItem(id, status) {
  return {
    id,
    status,
    update: async () => {},
  };
}

test('UTCID01: checkin succeeds for planner owner and sends first-checkin notifications', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, { id: itemId });
      }
      return createPreviousItem(itemId, 'visited');
    },
    plannerItemFindAll: async (options) => {
      if (options?.attributes && options.attributes.length === 3) {
        return [
          { id: 'item-1', leg_number: 1, order_index: 1 },
          { id: 'item-2', leg_number: 1, order_index: 2 },
        ];
      }
      return [
        { status: 'visited' },
        { status: 'upcoming' },
      ];
    },
    userCheckinFindAll: async (options) => {
      if (options?.where?.status === 'checked_in' && Array.isArray(options.where.planner_item_id)) {
        return [{ planner_item_id: 'item-1' }];
      }
      if (options?.where?.planner_item_id === 'item-2') {
        return [];
      }
      return [];
    },
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }, { user_id: 'member-2' }],
    userCheckinCount: async () => 1,
  });

  const result = await CheckinService.checkin(
    'owner-id',
    'item-2',
    16.7410,
    107.1852,
    ' Arrived safely ',
    '  https://cloudinary.com/checkin.jpg  '
  );

  assert.equal(result.checkin_id, 'checkin-id');
  assert.equal(result.distance, 120);
  assert.equal(result.planner_status, 'ongoing');
  assert.equal(result.photo_url, 'https://cloudinary.com/checkin.jpg');
  assert.equal(state.userCheckinFindOrCreateCalls.length, 1);
  assert.equal(state.notificationCreateCalls.length, 2);
  assert.equal(state.notificationCreateCalls[0].type, 'planner_first_checkin');
});

test('UTCID02: checkin succeeds at boundary distance and auto-completes planner for final participant', async () => {
  const { CheckinService, state, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, {
          id: itemId,
          planner: createPlannerRecord(createUpdatableRecord, { status: 'ongoing' }),
        });
      }
      return createPreviousItem(itemId, 'visited');
    },
    plannerItemFindAll: async (options) => {
      if (options?.attributes && options.attributes.length === 3) {
        return [
          { id: 'item-1', leg_number: 1, order_index: 1 },
          { id: 'item-2', leg_number: 1, order_index: 2 },
        ];
      }
      return [
        { status: 'visited' },
        { status: 'visited' },
      ];
    },
    userCheckinFindAll: async (options) => {
      if (options?.where?.status === 'checked_in' && Array.isArray(options.where.planner_item_id)) {
        return [{ planner_item_id: 'item-1' }];
      }
      return [];
    },
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinCount: async () => 2,
    getRouteInfo: async () => ({ distance: 500 }),
  });

  const result = await CheckinService.checkin(
    'owner-id',
    'item-2',
    16.7410,
    107.1852,
    null,
    'https://cloudinary.com/boundary.jpg'
  );

  assert.equal(result.distance, 500);
  assert.equal(result.planner_status, 'completed');
  assert.equal(state.plannerItemUpdateCalls.length, 1);
  assert.equal(state.plannerItemUpdateCalls[0].values.status, 'visited');
  assert.equal(state.plannerUpdateCalls.length, 1);
  assert.equal(state.plannerUpdateCalls[0].values.status, 'completed');
  assert.equal(state.antiFraudCalls.length, 1);
});

test('UTCID03: checkin rejects missing check-in photo', async () => {
  const { CheckinService, state } = loadCheckinService();

  await assert.rejects(
    CheckinService.checkin('owner-id', 'item-2', 16.7, 107.1, null, '   '),
    { message: 'Check-in photo is required' }
  );

  assert.equal(state.plannerItemFindByPkCalls.length, 0);
});

test('UTCID04: checkin rejects missing planner item', async () => {
  const { CheckinService } = loadCheckinService({
    plannerItemFindByPk: async () => null,
  });

  await assert.rejects(
    CheckinService.checkin('owner-id', 'missing-item', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'Planner item not found' }
  );
});

test('UTCID05: checkin rejects user who is not planner member', async () => {
  const { CheckinService, createUpdatableRecord, state } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, {
          id: itemId,
          planner: createPlannerRecord(createUpdatableRecord),
        });
      }
      return createPreviousItem(itemId, 'visited');
    },
    plannerMemberFindOne: async () => null,
  });

  await assert.rejects(
    CheckinService.checkin('outsider-id', 'item-2', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'You are not an active member of this plan' }
  );

  assert.equal(state.userCheckinFindOneCalls.length, 0);
});

test('UTCID06: checkin rejects planner that has not started yet', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, {
          id: itemId,
          planner: createPlannerRecord(createUpdatableRecord, { status: 'planning' }),
        });
      }
      return createPreviousItem(itemId, 'visited');
    },
  });

  await assert.rejects(
    CheckinService.checkin('owner-id', 'item-2', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'This plan has not started yet, cannot check-in' }
  );
});

test('UTCID07: checkin rejects duplicate checked-in user at same site', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, { id: itemId });
      }
      return createPreviousItem(itemId, 'visited');
    },
    userCheckinFindOne: async () => ({ id: 'existing-checkin' }),
  });

  await assert.rejects(
    CheckinService.checkin('owner-id', 'item-2', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'You have already checked-in at this site' }
  );
});

test('UTCID08: checkin rejects out-of-order sequential check-in', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, { id: itemId });
      }
      return createPreviousItem(itemId, 'upcoming');
    },
    plannerItemFindAll: async () => [
      { id: 'item-1', leg_number: 1, order_index: 1 },
      { id: 'item-2', leg_number: 1, order_index: 2 },
    ],
    userCheckinFindAll: async () => [],
  });

  await assert.rejects(
    CheckinService.checkin('owner-id', 'item-2', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'Sequential required: day 1, order 1' }
  );
});

test('UTCID09: checkin rejects user outside 500-meter radius', async () => {
  const { CheckinService, createUpdatableRecord } = loadCheckinService({
    plannerItemFindByPk: async (itemId, options) => {
      if (options && options.include) {
        return createPlannerItemRecord(createUpdatableRecord, { id: itemId });
      }
      return createPreviousItem(itemId, 'visited');
    },
    plannerItemFindAll: async (options) => {
      if (options?.attributes && options.attributes.length === 3) {
        return [{ id: 'item-2', leg_number: 1, order_index: 1 }];
      }
      return [{ status: 'upcoming' }];
    },
    userCheckinFindAll: async () => [],
    getRouteInfo: async () => ({ distance: 650 }),
  });

  await assert.rejects(
    CheckinService.checkin('owner-id', 'item-2', 16.7, 107.1, null, 'https://cloudinary.com/a.jpg'),
    { message: 'Too far: distance 650, radius 500' }
  );
});
