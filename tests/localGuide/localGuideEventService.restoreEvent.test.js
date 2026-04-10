const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideEventService } = require('./_localGuideTestHelper');

test('UTCID01: restoreEvent restores inactive pending event successfully', async () => {
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
      is_active: false,
    }),
  });

  const result = await LocalGuideEventService.restoreEvent('guide-id', 'event-id');

  assert.equal(result.is_active, true);
  assert.equal(state.eventInstanceUpdateCalls[0].values.is_active, true);
});

test('UTCID02: restoreEvent rejects when event is not found', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideEventService.restoreEvent('guide-id', 'missing-event-id'),
    { message: 'Event not found' }
  );
});

test('UTCID03: restoreEvent rejects approved event', async () => {
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
      is_active: false,
    }),
  });

  await assert.rejects(
    LocalGuideEventService.restoreEvent('guide-id', 'event-id'),
    { message: 'Cannot restore approved event' }
  );
});

test('UTCID04: restoreEvent rejects already active event', async () => {
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
      status: 'pending',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideEventService.restoreEvent('guide-id', 'event-id'),
    { message: 'Event is already active' }
  );
});

test('UTCID05: restoreEvent restores inactive rejected event successfully', async () => {
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
      is_active: false,
    }),
  });

  const result = await LocalGuideEventService.restoreEvent('guide-id', 'event-id');

  assert.equal(result.is_active, true);
  assert.equal(state.eventInstanceUpdateCalls[0].values.is_active, true);
});
