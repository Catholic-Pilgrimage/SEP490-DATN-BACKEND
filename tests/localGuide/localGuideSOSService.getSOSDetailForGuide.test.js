const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadLocalGuideSOSService,
  createUserRecord,
  createSiteRecord,
} = require('./_localGuideSOSTestHelper');

test('UTCID01: getSOSDetailForGuide returns SOS detail for the assigned site with pilgrim and guide metadata', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    sosFindOne: async () => ({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'accepted',
      message: 'Need urgent help',
      pilgrim: {
        id: 'pilgrim-1',
        full_name: 'Pilgrim One',
        phone: '0911111111',
        avatar_url: 'https://cdn.example.com/p1.jpg',
        email: 'pilgrim1@example.com',
      },
      assignedGuide: {
        id: 'guide-id',
        full_name: 'Guide One',
        phone: '0900000001',
        avatar_url: 'https://cdn.example.com/g1.jpg',
      },
      site: createSiteRecord({
        id: 'site-1',
        name: 'La Vang Shrine',
        address: 'Hue',
      }),
    }),
  });

  const result = await LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'sos-1');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    site_id: 'site-1',
  });
  assert.equal(state.sosFindOneCalls[0].include[0].as, 'pilgrim');
  assert.equal(state.sosFindOneCalls[0].include[1].as, 'assignedGuide');
  assert.equal(state.sosFindOneCalls[0].include[2].as, 'site');
  assert.equal(result.pilgrim.email, 'pilgrim1@example.com');
  assert.equal(result.site.name, 'La Vang Shrine');
});

test('UTCID02: getSOSDetailForGuide returns SOS detail even when the request has not been assigned yet', async () => {
  const { LocalGuideSOSService } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-2',
    }),
    sosFindOne: async () => ({
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'pending',
      pilgrim: {
        id: 'pilgrim-2',
        full_name: 'Pilgrim Two',
        phone: '0922222222',
        avatar_url: 'https://cdn.example.com/p2.jpg',
        email: 'pilgrim2@example.com',
      },
      assignedGuide: null,
      site: createSiteRecord({
        id: 'site-2',
        name: 'Tra Kieu Shrine',
      }),
    }),
  });

  const result = await LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'sos-2');

  assert.equal(result.status, 'pending');
  assert.equal(result.assignedGuide, null);
  assert.equal(result.pilgrim.full_name, 'Pilgrim Two');
});

test('UTCID03: getSOSDetailForGuide throws unauthorized when the requester is not an assigned local guide', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'pilgrim',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'sos-3'),
    { message: 'unauthorized' }
  );

  assert.equal(state.sosFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get SOS detail for guide error:');
});

test('UTCID04: getSOSDetailForGuide throws not_found when the SOS request does not exist', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-4',
    }),
    sosFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'missing-sos-id'),
    { message: 'not_found' }
  );

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'missing-sos-id',
    site_id: 'site-4',
  });
});

test('UTCID05: getSOSDetailForGuide throws not_found when the SOS belongs to another site', async () => {
  const { LocalGuideSOSService } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-5',
    }),
    sosFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'other-site-sos'),
    { message: 'not_found' }
  );
});

test('UTCID06: getSOSDetailForGuide logs and rethrows database errors', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-6',
    }),
    sosFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    LocalGuideSOSService.getSOSDetailForGuide('guide-id', 'sos-6'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get SOS detail for guide error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
