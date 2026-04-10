const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerContentService } = require('./_managerContentTestHelper');

test('UTCID01: updateEventStatus approves pending event successfully', async () => {
  const { ManagerContentService, state, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407001',
      name: 'Easter Celebration',
      site_id: 'site-1',
      status: 'pending',
      created_by: 'guide-id',
    }),
  });

  const result = await ManagerContentService.updateEventStatus('manager-id', 'event-id', 'approved');

  assert.equal(result.status, 'approved');
  assert.equal(state.eventInstanceUpdateCalls[0].values.status, 'approved');
  assert.equal(state.eventInstanceUpdateCalls[0].values.reviewed_by, 'manager-id');
  assert.equal(state.createNotificationCalls[0][0], 'event_approved');
  assert.equal(state.favoriteNotificationCalls[0][0], 'site-1');
});

test('UTCID02: updateEventStatus rejects pending event with reason', async () => {
  const { ManagerContentService, state, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407002',
      name: 'Youth Meeting',
      site_id: 'site-1',
      status: 'pending',
      created_by: 'guide-id',
    }),
  });

  const result = await ManagerContentService.updateEventStatus('manager-id', 'event-id', 'rejected', 'Need more details');

  assert.equal(result.status, 'rejected');
  assert.equal(state.eventInstanceUpdateCalls[0].values.rejection_reason, 'Need more details');
  assert.equal(state.createNotificationCalls[0][0], 'event_rejected');
  assert.equal(state.favoriteNotificationCalls.length, 0);
});

test('UTCID03: updateEventStatus rejects unauthorized user', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('guide-id', 'event-id', 'approved'),
    { message: 'Unauthorized' }
  );
});

test('UTCID04: updateEventStatus rejects manager without site', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('manager-id', 'event-id', 'approved'),
    { message: 'Manager has no site' }
  );
});

test('UTCID05: updateEventStatus rejects invalid status', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('manager-id', 'event-id', 'inactive'),
    { message: 'Invalid status' }
  );
});

test('UTCID06: updateEventStatus requires rejection reason for rejected status', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('manager-id', 'event-id', 'rejected'),
    { message: 'Rejection reason required' }
  );
});

test('UTCID07: updateEventStatus rejects when event is not found', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => null,
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('manager-id', 'missing-event-id', 'approved'),
    { message: 'Event not found' }
  );
});

test('UTCID08: updateEventStatus rejects already reviewed event', async () => {
  const { ManagerContentService, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407008',
      site_id: 'site-1',
      status: 'approved',
      created_by: 'guide-id',
    }),
  });

  await assert.rejects(
    ManagerContentService.updateEventStatus('manager-id', 'event-id', 'approved'),
    { message: 'Already reviewed' }
  );
});
