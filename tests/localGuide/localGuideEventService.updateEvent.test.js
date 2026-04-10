const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideEventService } = require('./_localGuideTestHelper');

test('UTCID01: updateEvent updates pending event successfully', async () => {
  const { LocalGuideEventService, state, createEventInstance } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      name: 'Old Event',
      start_date: '2999-12-31',
      is_active: true,
    }),
  });

  const result = await LocalGuideEventService.updateEvent(
    'guide-id',
    'event-id',
    { name: 'Updated Event', location: 'Hall B' },
    'https://res.cloudinary.com/demo/image/upload/v2/new-banner.jpg'
  );

  assert.equal(result.name, 'Updated Event');
  assert.equal(state.eventInstanceUpdateCalls[0].values.location, 'Hall B');
  assert.equal(state.eventInstanceUpdateCalls[0].values.banner_url, 'https://res.cloudinary.com/demo/image/upload/v2/new-banner.jpg');
});

test('UTCID02: updateEvent resets rejected event to pending', async () => {
  const { LocalGuideEventService, state, createEventInstance } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'rejected',
      start_date: '2999-12-31',
      rejection_reason: 'Need fix',
      reviewed_by: 'manager-id',
      reviewed_at: new Date('2026-04-06T00:00:00.000Z'),
      is_active: true,
    }),
  });

  const result = await LocalGuideEventService.updateEvent('guide-id', 'event-id', {
    description: 'Updated description',
  });

  assert.equal(result.status, 'pending');
  assert.equal(state.eventInstanceUpdateCalls[0].values.status, 'pending');
  assert.equal(state.eventInstanceUpdateCalls[0].values.rejection_reason, null);
});

test('UTCID03: updateEvent rejects unauthorized user', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideEventService.updateEvent('manager-id', 'event-id', { name: 'Updated' }),
    { message: 'Unauthorized' }
  );
});

test('UTCID04: updateEvent rejects when event is not found', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideEventService.updateEvent('guide-id', 'missing-event-id', { name: 'Updated' }),
    { message: 'Event not found' }
  );
});

test('UTCID05: updateEvent rejects approved event', async () => {
  const { LocalGuideEventService, createEventInstance } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'approved',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideEventService.updateEvent('guide-id', 'event-id', { name: 'Updated' }),
    { message: 'Cannot update approved event' }
  );
});

test('UTCID06: updateEvent updates pending event with partial fields only', async () => {
  const { LocalGuideEventService, state, createEventInstance } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      start_date: '2999-12-31',
      is_active: true,
    }),
  });

  const result = await LocalGuideEventService.updateEvent('guide-id', 'event-id', {
    start_time: '10:00',
  });

  assert.equal(result.start_time, '10:00');
  assert.deepEqual(state.eventInstanceUpdateCalls[0].values, {
    start_time: '10:00',
    time_state: 'upcoming'
  });
});
