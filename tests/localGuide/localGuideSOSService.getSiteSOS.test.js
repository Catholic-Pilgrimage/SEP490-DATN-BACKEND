const test = require('node:test');
const assert = require('node:assert/strict');

const { Op } = require('sequelize');

const {
  loadLocalGuideSOSService,
  createUserRecord,
} = require('./_localGuideSOSTestHelper');

test('UTCID01: getSiteSOS returns pending and accepted SOS requests by default for the guide site', async () => {
  const rows = [
    {
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'pending',
      pilgrim: {
        id: 'pilgrim-1',
        full_name: 'Pilgrim One',
        phone: '0911111111',
        avatar_url: 'https://cdn.example.com/p1.jpg',
      },
      assignedGuide: null,
      site: {
        id: 'site-1',
        name: 'La Vang Shrine',
      },
    },
  ];

  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    sosFindAndCountAll: async () => ({
      count: 1,
      rows,
    }),
  });

  const result = await LocalGuideSOSService.getSiteSOS('guide-id');

  assert.deepEqual(state.sosFindAndCountAllCalls[0].where, {
    site_id: 'site-1',
    status: { [Op.in]: ['pending', 'accepted'] },
  });
  assert.deepEqual(state.sosFindAndCountAllCalls[0].order, [
    ['status', 'ASC'],
    ['created_at', 'DESC'],
  ]);
  assert.equal(result.sosRequests.length, 1);
  assert.equal(result.sosRequests[0].pilgrim.full_name, 'Pilgrim One');
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
});

test('UTCID02: getSiteSOS applies explicit status filter and second-page pagination', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-2',
    }),
    sosFindAndCountAll: async () => ({
      count: 2,
      rows: [
        {
          id: 'sos-2',
          code: 'SOS0410002',
          status: 'resolved',
        },
      ],
    }),
  });

  const result = await LocalGuideSOSService.getSiteSOS('guide-id', {
    status: 'resolved',
    page: '2',
    limit: '1',
  });

  assert.deepEqual(state.sosFindAndCountAllCalls[0].where, {
    site_id: 'site-2',
    status: 'resolved',
  });
  assert.equal(state.sosFindAndCountAllCalls[0].offset, 1);
  assert.equal(state.sosFindAndCountAllCalls[0].limit, 1);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 1,
    total: 2,
    totalPages: 2,
  });
});

test('UTCID03: getSiteSOS show_all omits the default active-status filter and falls back invalid pagination values', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-3',
    }),
    sosFindAndCountAll: async () => ({
      count: 3,
      rows: [
        { id: 'sos-3', status: 'pending' },
        { id: 'sos-4', status: 'resolved' },
        { id: 'sos-5', status: 'cancelled' },
      ],
    }),
  });

  const result = await LocalGuideSOSService.getSiteSOS('guide-id', {
    show_all: true,
    page: 'abc',
    limit: 'xyz',
  });

  assert.deepEqual(state.sosFindAndCountAllCalls[0].where, {
    site_id: 'site-3',
  });
  assert.equal(state.sosFindAndCountAllCalls[0].offset, 0);
  assert.equal(state.sosFindAndCountAllCalls[0].limit, 10);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  });
});

test('UTCID04: getSiteSOS throws unauthorized when the requester is not an assigned local guide', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'pilgrim',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.getSiteSOS('guide-id'),
    { message: 'unauthorized' }
  );

  assert.equal(state.sosFindAndCountAllCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get site SOS error:');
});

test('UTCID05: getSiteSOS returns an empty list when no SOS request matches the guide site filters', async () => {
  const { LocalGuideSOSService } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-5',
    }),
    sosFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await LocalGuideSOSService.getSiteSOS('guide-id', {
    status: 'resolved',
  });

  assert.deepEqual(result, {
    sosRequests: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
});

test('UTCID06: getSiteSOS logs and rethrows database errors', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-6',
    }),
    sosFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    LocalGuideSOSService.getSiteSOS('guide-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get site SOS error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
