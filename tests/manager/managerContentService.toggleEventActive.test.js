const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerContentService } = require('./_managerContentTestHelper');

test('UTCID01: toggleEventActive deactivates approved event successfully', async () => {
  const { ManagerContentService, state, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407001',
      site_id: 'site-1',
      status: 'approved',
      is_active: true,
    }),
  });

  const result = await ManagerContentService.toggleEventActive('manager-id', 'event-id', false);

  assert.equal(result.is_active, false);
  assert.equal(state.eventInstanceUpdateCalls[0].values.is_active, false);
});

test('UTCID02: toggleEventActive restores approved event successfully', async () => {
  const { ManagerContentService, state, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407002',
      site_id: 'site-1',
      status: 'approved',
      is_active: false,
    }),
  });

  const result = await ManagerContentService.toggleEventActive('manager-id', 'event-id', true);

  assert.equal(result.is_active, true);
  assert.equal(state.eventInstanceUpdateCalls[0].values.is_active, true);
});

test('UTCID03: toggleEventActive rejects unauthorized user', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerContentService.toggleEventActive('guide-id', 'event-id', false),
    { message: 'Unauthorized' }
  );
});

test('UTCID04: toggleEventActive rejects manager without site', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerContentService.toggleEventActive('manager-id', 'event-id', false),
    { message: 'Manager has no site' }
  );
});

test('UTCID05: toggleEventActive rejects when event is not found', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => null,
  });

  await assert.rejects(
    ManagerContentService.toggleEventActive('manager-id', 'missing-event-id', false),
    { message: 'Event not found' }
  );
});

test('UTCID06: toggleEventActive rejects non-approved event', async () => {
  const { ManagerContentService, createEventInstance } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventFindOne: async () => createEventInstance({
      id: 'event-id',
      code: 'EVT0407006',
      site_id: 'site-1',
      status: 'pending',
      is_active: true,
    }),
  });

  await assert.rejects(
    ManagerContentService.toggleEventActive('manager-id', 'event-id', false),
    { message: 'Only approved event can be toggled' }
  );
});
