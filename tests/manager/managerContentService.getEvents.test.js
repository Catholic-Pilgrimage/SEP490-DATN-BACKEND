const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerContentService } = require('./_managerContentTestHelper');

test('UTCID01: getEvents returns paginated site events successfully', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventCount: async () => 2,
    eventFindAll: async () => [
      { id: 'event-1', code: 'EVT0407001' },
      { id: 'event-2', code: 'EVT0407002' },
    ],
  });

  const result = await ManagerContentService.getEvents('manager-id', { page: 1, limit: 10 });

  assert.equal(result.data.length, 2);
  assert.equal(result.pagination.totalItems, 2);
  assert.equal(result.pagination.totalPages, 1);
});

test('UTCID02: getEvents applies status filter correctly', async () => {
  const { ManagerContentService, state } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventCount: async () => 1,
    eventFindAll: async () => [{ id: 'event-1', status: 'approved' }],
  });

  await ManagerContentService.getEvents('manager-id', { status: 'approved', page: 2, limit: 5 });

  assert.equal(state.eventCountCalls[0].where.status, 'approved');
  assert.equal(state.eventFindAllCalls[0].offset, 5);
  assert.equal(state.eventFindAllCalls[0].limit, 5);
});

test('UTCID03: getEvents applies inactive filter correctly', async () => {
  const { ManagerContentService, state } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventCount: async () => 1,
    eventFindAll: async () => [{ id: 'event-1', is_active: false }],
  });

  await ManagerContentService.getEvents('manager-id', { is_active: false });

  assert.equal(state.eventCountCalls[0].where.is_active, false);
});

test('UTCID04: getEvents returns pagination metadata for second page', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    eventCount: async () => 7,
    eventFindAll: async () => [{ id: 'event-6' }, { id: 'event-7' }],
  });

  const result = await ManagerContentService.getEvents('manager-id', { page: 2, limit: 5 });

  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.limit, 5);
  assert.equal(result.pagination.totalPages, 2);
});

test('UTCID05: getEvents rejects unauthorized user', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerContentService.getEvents('pilgrim-id'),
    { message: 'Unauthorized' }
  );
});

test('UTCID06: getEvents rejects manager without site', async () => {
  const { ManagerContentService } = loadManagerContentService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerContentService.getEvents('manager-id'),
    { message: 'Manager has no site' }
  );
});
