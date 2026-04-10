const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimSOSService } = require('./_sosTestHelper');

test('UTCID01: getSOSDetail returns SOS detail with site and assigned guide information', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindOne: async () => ({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'accepted',
      message: 'Need urgent support',
      site: {
        id: 'site-1',
        name: 'La Vang Shrine',
        address: 'Hue',
        province: 'Hue',
      },
      assignedGuide: {
        id: 'guide-1',
        full_name: 'Guide One',
        phone: '0900000001',
        avatar_url: 'https://cdn.example.com/guide-1.jpg',
      },
    }),
  });

  const result = await PilgrimSOSService.getSOSDetail('user-id', 'sos-1');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    user_id: 'user-id',
  });
  assert.equal(state.sosFindOneCalls[0].include[0].as, 'site');
  assert.equal(state.sosFindOneCalls[0].include[1].as, 'assignedGuide');
  assert.equal(result.site.name, 'La Vang Shrine');
  assert.equal(result.assignedGuide.full_name, 'Guide One');
});

test('UTCID02: getSOSDetail returns SOS detail even when no guide has been assigned yet', async () => {
  const { PilgrimSOSService } = loadPilgrimSOSService({
    sosFindOne: async () => ({
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'pending',
      message: 'Waiting for help',
      site: {
        id: 'site-2',
        name: 'Tra Kieu Shrine',
        address: 'Quang Nam',
        province: 'Quang Nam',
      },
      assignedGuide: null,
    }),
  });

  const result = await PilgrimSOSService.getSOSDetail('user-id', 'sos-2');

  assert.equal(result.status, 'pending');
  assert.equal(result.site.name, 'Tra Kieu Shrine');
  assert.equal(result.assignedGuide, null);
});

test('UTCID03: getSOSDetail throws not_found when the SOS request does not exist', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSOSService.getSOSDetail('user-id', 'missing-sos-id'),
    { message: 'not_found' }
  );

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'missing-sos-id',
    user_id: 'user-id',
  });
});

test('UTCID04: getSOSDetail throws not_found when the SOS belongs to another pilgrim', async () => {
  const { PilgrimSOSService } = loadPilgrimSOSService({
    sosFindOne: async (_options) => null,
  });

  await assert.rejects(
    PilgrimSOSService.getSOSDetail('user-id', 'sos-of-other-user'),
    { message: 'not_found' }
  );
});

test('UTCID05: getSOSDetail logs and rethrows database errors', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSOSService.getSOSDetail('user-id', 'sos-5'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get SOS detail error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
