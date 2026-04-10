const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideEventService } = require('./_localGuideTestHelper');

test('UTCID01: deleteEvent soft deletes pending event successfully', async () => {
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
      is_active: true,
    }),
  });

  const result = await LocalGuideEventService.deleteEvent('guide-id', 'event-id');

  assert.equal(result.message, 'Event deleted successfully');
  assert.equal(state.eventInstanceUpdateCalls[0].values.is_active, false);
});

test('UTCID02: deleteEvent rejects when event is not found', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    eventFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideEventService.deleteEvent('guide-id', 'missing-event-id'),
    { message: 'Event not found' }
  );
});

test('UTCID03: deleteEvent rejects approved event', async () => {
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
    LocalGuideEventService.deleteEvent('guide-id', 'event-id'),
    { message: 'Cannot delete approved event' }
  );
});

test('UTCID04: deleteEvent rejects unauthorized user', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideEventService.deleteEvent('manager-id', 'event-id'),
    { message: 'Unauthorized' }
  );
});
