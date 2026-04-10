const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadLocalGuideSOSService,
  createUserRecord,
  createSiteRecord,
} = require('./_localGuideSOSTestHelper');

test('UTCID01: assignSOS accepts a pending SOS at the guide site and notifies the pilgrim', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Guide One',
      phone: '0900000001',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'pending',
      site_id: 'site-1',
      user_id: 'pilgrim-1',
    }),
    sosFindByPk: async () => ({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'accepted',
      assigned_to: 'guide-id',
      pilgrim: {
        id: 'pilgrim-1',
        full_name: 'Pilgrim One',
        phone: '0911111111',
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
      }),
    }),
  });

  const result = await LocalGuideSOSService.assignSOS('guide-id', 'sos-1');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    site_id: 'site-1',
  });
  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'accepted');
  assert.equal(state.sosUpdateCalls[0].values.assigned_to, 'guide-id');
  assert.ok(state.sosUpdateCalls[0].values.assigned_at instanceof Date);
  assert.equal(state.createNotificationCalls.length, 1);
  assert.equal(state.createNotificationCalls[0][0], 'sos_assigned');
  assert.equal(state.createNotificationCalls[0][1], 'pilgrim-1');
  assert.deepEqual(state.createNotificationCalls[0][2], {
    guideName: 'Guide One',
    guidePhone: '0900000001',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.ok(String(state.infoLogs[0][0]).includes('SOS SOS0410001 assigned to guide guide-id'));
  assert.equal(result.status, 'accepted');
  assert.equal(result.assignedGuide.full_name, 'Guide One');
});

test('UTCID02: assignSOS throws unauthorized when the requester is not an assigned local guide', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'pilgrim',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'sos-2'),
    { message: 'unauthorized' }
  );

  assert.equal(state.sosFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Assign SOS error:');
});

test('UTCID03: assignSOS throws not_found when the SOS request does not exist in the guide site', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-3',
    }),
    sosFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'missing-sos-id'),
    { message: 'not_found' }
  );

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'missing-sos-id',
    site_id: 'site-3',
  });
});

test('UTCID04: assignSOS throws already_accepted when another guide has already accepted the SOS', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-4',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-4',
      code: 'SOS0410004',
      status: 'accepted',
      site_id: 'site-4',
      assigned_to: 'other-guide-id',
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'sos-4'),
    { message: 'already_accepted' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID05: assignSOS throws not_pending when the SOS request is already closed', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-5',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-5',
      code: 'SOS0410005',
      status: 'resolved',
      site_id: 'site-5',
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'sos-5'),
    { message: 'not_pending' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID06: assignSOS logs and rethrows notification errors after assignment update', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-6',
      full_name: 'Guide Six',
      phone: '0966666666',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-6',
      code: 'SOS0410006',
      status: 'pending',
      site_id: 'site-6',
      user_id: 'pilgrim-6',
    }),
    createNotification: async () => {
      throw new Error('Notification unavailable');
    },
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'sos-6'),
    { message: 'Notification unavailable' }
  );

  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'accepted');
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Assign SOS error:');
  assert.equal(state.errorLogs[0][1].message, 'Notification unavailable');
});

test('UTCID07: assignSOS re-reads status when another actor accepts the SOS first', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-7',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-7',
      code: 'SOS0410007',
      status: 'pending',
      site_id: 'site-7',
      user_id: 'pilgrim-7',
    }),
    sosUpdate: async () => [0],
    sosFindByPk: async () => ({ status: 'accepted' }),
  });

  await assert.rejects(
    LocalGuideSOSService.assignSOS('guide-id', 'sos-7'),
    { message: 'already_accepted' }
  );

  assert.equal(state.createNotificationCalls.length, 0);
  assert.equal(state.sosFindByPkCalls.length, 1);
  assert.deepEqual(state.sosFindByPkCalls[0].options.attributes, ['status']);
});
