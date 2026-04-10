const test = require('node:test');
const assert = require('node:assert/strict');

const { Op } = require('sequelize');

const {
  loadPilgrimSiteService,
  createSiteRecord,
} = require('./_siteTestHelper');

test('UTCID01: getPublicSites returns active public sites with default pagination and computed rating fields', async () => {
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

  const result = await PilgrimSiteService.getPublicSites();

  assert.deepEqual(state.siteFindAndCountAllCalls[0].where, {
    is_active: true,
  });
  assert.equal(state.siteFindAndCountAllCalls[0].include.length, 0);
  assert.equal(state.siteFindAndCountAllCalls[0].limit, 10);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 0);
  assert.equal(state.siteFindAndCountAllCalls[0].order[0][0], 'name');
  assert.equal(state.siteFindAndCountAllCalls[0].distinct, true);
  assert.equal(result.data.length, 1);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    totalItems: 1,
    totalPages: 1,
  });
});

test('UTCID02: getPublicSites applies province, region, type, search, and has_events filters without date range', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 1,
      rows: [createSiteRecord({ id: 'site-2', province: 'Quang Nam', region: 'Central' })],
    }),
  });

  const result = await PilgrimSiteService.getPublicSites({
    province: 'Quang Nam',
    region: 'Central',
    type: 'shrine',
    search: 'Tra',
    has_events: 'true',
  });

  assert.deepEqual(state.siteFindAndCountAllCalls[0].where, {
    is_active: true,
    province: 'Quang Nam',
    region: 'Central',
    type: 'shrine',
    name: { [Op.iLike]: '%Tra%' },
  });
  assert.equal(state.siteFindAndCountAllCalls[0].include.length, 1);
  assert.equal(state.siteFindAndCountAllCalls[0].include[0].as, 'events');
  assert.equal(state.siteFindAndCountAllCalls[0].include[0].required, true);
  assert.deepEqual(state.siteFindAndCountAllCalls[0].include[0].where, {
    status: 'approved',
    is_active: true,
    time_state: { [Op.in]: ['upcoming', 'ongoing'] },
  });
  assert.equal(result.data.length, 1);
});

test('UTCID03: getPublicSites applies event overlap filter when has_events uses a date range', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createSiteRecord({ id: 'site-3', name: 'Date Filter Shrine' }),
        createSiteRecord({ id: 'site-4', name: 'Holy Event Site' }),
      ],
    }),
  });

  const result = await PilgrimSiteService.getPublicSites({
    has_events: 'true',
    start_date: '2026-05-01',
    end_date: '2026-05-03',
    page: '2',
    limit: '2',
  });

  const eventWhere = state.siteFindAndCountAllCalls[0].include[0].where;
  assert.deepEqual(eventWhere.start_date, { [Op.lte]: '2026-05-03' });
  assert.deepEqual(eventWhere[Op.or], [
    { end_date: { [Op.gte]: '2026-05-01' } },
    { end_date: null, start_date: { [Op.gte]: '2026-05-01' } },
  ]);
  assert.equal(state.siteFindAndCountAllCalls[0].limit, 2);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 2);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 2,
    totalItems: 2,
    totalPages: 1,
  });
});

test('UTCID04: getPublicSites falls back to default pagination when page and limit are invalid', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 3,
      rows: [
        createSiteRecord({ id: 'site-5' }),
        createSiteRecord({ id: 'site-6' }),
        createSiteRecord({ id: 'site-7' }),
      ],
    }),
  });

  const result = await PilgrimSiteService.getPublicSites({
    page: 'abc',
    limit: 'xyz',
  });

  assert.equal(state.siteFindAndCountAllCalls[0].limit, 10);
  assert.equal(state.siteFindAndCountAllCalls[0].offset, 0);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    totalItems: 3,
    totalPages: 1,
  });
});

test('UTCID05: getPublicSites returns an empty list when no public site matches the filters', async () => {
  const { PilgrimSiteService } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await PilgrimSiteService.getPublicSites({
    province: 'Da Nang',
  });

  assert.deepEqual(result, {
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
    },
  });
});

test('UTCID06: getPublicSites logs and rethrows database errors', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSiteService.getPublicSites(),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get public sites error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
