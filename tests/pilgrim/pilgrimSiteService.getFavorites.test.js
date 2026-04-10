const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSiteService,
  createSiteRecord,
} = require('./_siteTestHelper');

test('UTCID01: getFavorites returns active favorite sites with default pagination', async () => {
  const rows = [
    createSiteRecord({
      id: 'site-1',
      code: 'SITE001',
      name: 'La Vang Shrine',
    }),
  ];

  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 1,
      rows,
    }),
  });

  const result = await PilgrimSiteService.getFavorites('user-id');

  assert.equal(state.siteFindAndCountAllCalls.length, 1);
  assert.deepEqual(state.siteFindAndCountAllCalls[0].where, {
    is_active: true,
  });
  assert.equal(state.siteFindAndCountAllCalls[0].include[0].as, 'favoritedBy');
  assert.deepEqual(state.siteFindAndCountAllCalls[0].include[0].where, {
    id: 'user-id',
  });
  assert.equal(state.siteFindAndCountAllCalls[0].limit, 10);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 0);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'User user-id retrieved 1 favorite sites');
});

test('UTCID02: getFavorites applies second-page pagination correctly', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createSiteRecord({
          id: 'site-2',
          code: 'SITE002',
          name: 'Tra Kieu Shrine',
        }),
      ],
    }),
  });

  const result = await PilgrimSiteService.getFavorites('user-id', {
    page: '2',
    limit: '1',
  });

  assert.equal(state.siteFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 1);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 1,
    total: 2,
    totalPages: 2,
  });
});

test('UTCID03: getFavorites falls back to default pagination when page and limit are invalid', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 3,
      rows: [
        createSiteRecord({ id: 'site-3' }),
        createSiteRecord({ id: 'site-4' }),
        createSiteRecord({ id: 'site-5' }),
      ],
    }),
  });

  const result = await PilgrimSiteService.getFavorites('user-id', {
    page: 'abc',
    limit: 'xyz',
  });

  assert.equal(state.siteFindAndCountAllCalls[0].limit, 10);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 0);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  });
});

test('UTCID04: getFavorites returns an empty list when the user has no active favorites', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await PilgrimSiteService.getFavorites('user-id');

  assert.deepEqual(result, {
    sites: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'User user-id retrieved 0 favorite sites');
});

test('UTCID05: getFavorites logs and rethrows database errors', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSiteService.getFavorites('user-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get favorites error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
