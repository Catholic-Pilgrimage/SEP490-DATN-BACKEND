const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadLocalGuideSOSService,
  createUserRecord,
} = require('./_localGuideSOSTestHelper');

test('UTCID01: resolveSOS resolves an assigned SOS and notifies the pilgrim', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'accepted',
      site_id: 'site-1',
      user_id: 'pilgrim-1',
      assigned_to: 'guide-id',
      assigned_at: new Date('2026-04-10T01:00:00.000Z'),
      notes: null,
    }),
  });

  const result = await LocalGuideSOSService.resolveSOS('guide-id', 'sos-1', 'Pilgrim is safe');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    site_id: 'site-1',
  });
  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'resolved');
  assert.equal(state.sosUpdateCalls[0].values.notes, 'Pilgrim is safe');
  assert.ok(state.sosUpdateCalls[0].values.resolved_at instanceof Date);
  assert.equal(state.sosUpdateCalls[0].values.assigned_to, 'guide-id');
  assert.equal(state.createNotificationCalls.length, 1);
  assert.equal(state.createNotificationCalls[0][0], 'sos_resolved');
  assert.equal(state.createNotificationCalls[0][1], 'pilgrim-1');
  assert.deepEqual(state.createNotificationCalls[0][2], {
    sosCode: 'SOS0410001',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.ok(String(state.infoLogs[0][0]).includes('SOS SOS0410001 resolved by guide guide-id'));
  assert.equal(result.status, 'resolved');
});

test('UTCID02: resolveSOS can resolve an unassigned SOS and auto-assign it to the resolver', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-2',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'pending',
      site_id: 'site-2',
      user_id: 'pilgrim-2',
      assigned_to: null,
      assigned_at: null,
      notes: 'Original note',
    }),
  });

  const result = await LocalGuideSOSService.resolveSOS('guide-id', 'sos-2');

  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'resolved');
  assert.equal(state.sosUpdateCalls[0].values.notes, 'Original note');
  assert.equal(state.sosUpdateCalls[0].values.assigned_to, 'guide-id');
  assert.ok(state.sosUpdateCalls[0].values.assigned_at instanceof Date);
  assert.equal(result.assigned_to, 'guide-id');
  assert.equal(result.status, 'resolved');
});

test('UTCID03: resolveSOS throws unauthorized when the requester is not an assigned local guide', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'pilgrim',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'sos-3'),
    { message: 'unauthorized' }
  );

  assert.equal(state.sosFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Resolve SOS error:');
});

test('UTCID04: resolveSOS throws not_found when the SOS request does not exist in the guide site', async () => {
  const { LocalGuideSOSService, state } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-4',
    }),
    sosFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'missing-sos-id'),
    { message: 'not_found' }
  );

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'missing-sos-id',
    site_id: 'site-4',
  });
});

test('UTCID05: resolveSOS throws already_resolved when the SOS has already been resolved', async () => {
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
      assigned_to: 'guide-id',
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'sos-5'),
    { message: 'already_resolved' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID06: resolveSOS throws was_cancelled when the SOS was cancelled by the pilgrim', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-6',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-6',
      code: 'SOS0410006',
      status: 'cancelled',
      site_id: 'site-6',
      assigned_to: null,
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'sos-6'),
    { message: 'was_cancelled' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID07: resolveSOS throws only_assigned_can_resolve when another guide is assigned', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-7',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-7',
      code: 'SOS0410007',
      status: 'accepted',
      site_id: 'site-7',
      assigned_to: 'other-guide-id',
      user_id: 'pilgrim-7',
    }),
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'sos-7'),
    { message: 'only_assigned_can_resolve' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID08: resolveSOS logs and rethrows notification errors after status update', async () => {
  const { LocalGuideSOSService, state, createSOSRecord } = loadLocalGuideSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-8',
    }),
    sosFindOne: async () => createSOSRecord({
      id: 'sos-8',
      code: 'SOS0410008',
      status: 'accepted',
      site_id: 'site-8',
      user_id: 'pilgrim-8',
      assigned_to: 'guide-id',
      assigned_at: new Date('2026-04-10T02:00:00.000Z'),
    }),
    createNotification: async () => {
      throw new Error('Notification unavailable');
    },
  });

  await assert.rejects(
    LocalGuideSOSService.resolveSOS('guide-id', 'sos-8', 'Handled'),
    { message: 'Notification unavailable' }
  );

  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'resolved');
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Resolve SOS error:');
  assert.equal(state.errorLogs[0][1].message, 'Notification unavailable');
});
