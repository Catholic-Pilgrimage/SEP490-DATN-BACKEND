const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimSOSService } = require('./_sosTestHelper');

test('UTCID01: getMySOS returns the current pilgrim SOS requests with default pagination', async () => {
  const rows = [
    {
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'pending',
      site: {
        id: 'site-1',
        name: 'La Vang Shrine',
        address: 'Hue',
      },
      assignedGuide: {
        id: 'guide-1',
        full_name: 'Guide One',
        phone: '0900000001',
        avatar_url: 'https://cdn.example.com/guide-1.jpg',
      },
    },
  ];

  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindAndCountAll: async () => ({
      count: 1,
      rows,
    }),
  });

  const result = await PilgrimSOSService.getMySOS('user-id');

  assert.deepEqual(state.sosFindAndCountAllCalls[0], {
    where: { user_id: 'user-id' },
    include: [
      {
        model: require('../../models').Site,
        as: 'site',
        attributes: ['id', 'name', 'address'],
      },
      {
        model: require('../../models').User,
        as: 'assignedGuide',
        attributes: ['id', 'full_name', 'phone', 'avatar_url'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: 10,
    offset: 0,
  });
  assert.equal(result.sosRequests.length, 1);
  assert.equal(result.sosRequests[0].site.name, 'La Vang Shrine');
  assert.equal(result.sosRequests[0].assignedGuide.full_name, 'Guide One');
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
});

test('UTCID02: getMySOS applies status filter and second-page pagination correctly', async () => {
  const rows = [
    {
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'accepted',
      site: null,
      assignedGuide: null,
    },
  ];

  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindAndCountAll: async () => ({
      count: 2,
      rows,
    }),
  });

  const result = await PilgrimSOSService.getMySOS('user-id', {
    page: '2',
    limit: '1',
    status: 'accepted',
  });

  assert.deepEqual(state.sosFindAndCountAllCalls[0].where, {
    user_id: 'user-id',
    status: 'accepted',
  });
  assert.equal(state.sosFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.sosFindAndCountAllCalls[0].offset, 1);
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 1,
    total: 2,
    totalPages: 2,
  });
});

test('UTCID03: getMySOS falls back to default pagination when page and limit are invalid', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindAndCountAll: async () => ({
      count: 3,
      rows: [
        { id: 'sos-3', code: 'SOS0410003', status: 'pending' },
        { id: 'sos-4', code: 'SOS0410004', status: 'resolved' },
        { id: 'sos-5', code: 'SOS0410005', status: 'cancelled' },
      ],
    }),
  });

  const result = await PilgrimSOSService.getMySOS('user-id', {
    page: 'abc',
    limit: 'xyz',
    status: '',
  });

  assert.deepEqual(state.sosFindAndCountAllCalls[0].where, {
    user_id: 'user-id',
  });
  assert.equal(state.sosFindAndCountAllCalls[0].limit, 10);
  assert.equal(state.sosFindAndCountAllCalls[0].offset, 0);
  assert.deepEqual(result.pagination, {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
  });
});

test('UTCID04: getMySOS returns an empty list when the pilgrim has no SOS request', async () => {
  const { PilgrimSOSService } = loadPilgrimSOSService({
    sosFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await PilgrimSOSService.getMySOS('user-id', {
    page: '1',
    limit: '10',
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

test('UTCID05: getMySOS logs and rethrows database errors', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSOSService.getMySOS('user-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get my SOS error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
