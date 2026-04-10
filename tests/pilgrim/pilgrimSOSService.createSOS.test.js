const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSOSService,
  createUserRecord,
  createSiteRecord,
  createPlannerRecord,
} = require('./_sosTestHelper');

function stubPilgrimSOSMethod(PilgrimSOSService, methodName, implementation) {
  PilgrimSOSService[methodName] = implementation;
}

test('UTCID01: createSOS creates pending SOS, notifies on-duty guides, and broadcasts to planner members', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim One',
      phone: '0911111111',
    }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-1',
      name: 'La Vang Shrine',
    }),
    sosFindOne: async () => null,
    sosCreate: async (data) => ({
      id: 'sos-1',
      code: data.code,
      user_id: data.user_id,
      site_id: data.site_id,
      status: data.status,
      latitude: data.latitude,
      longitude: data.longitude,
      message: data.message,
      contact_phone: data.contact_phone,
    }),
    sosFindByPk: async () => ({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'pending',
      site: {
        id: 'site-1',
        name: 'La Vang Shrine',
        address: 'Hue',
      },
    }),
    plannerMemberFindAll: async (options) => {
      if (options.where?.user_id) {
        return [
          { planner: createPlannerRecord({ id: 'planner-1', user_id: 'owner-id' }) },
        ];
      }

      if (options.where?.planner_id === 'planner-1') {
        return [
          { user_id: 'user-id' },
          { user_id: 'member-1' },
        ];
      }

      return [];
    },
    plannerFindAll: async () => [],
    plannerFindByPk: async () => createPlannerRecord({ id: 'planner-1', user_id: 'owner-id' }),
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410001');
  stubPilgrimSOSMethod(PilgrimSOSService, 'findOnDutyGuides', async () => ([
    { id: 'guide-1', full_name: 'Guide One' },
    { id: 'guide-2', full_name: 'Guide Two' },
  ]));

  const result = await PilgrimSOSService.createSOS('user-id', {
    site_id: 'site-1',
    latitude: 16.3001,
    longitude: 107.5902,
    message: 'Need urgent help',
  });

  assert.deepEqual(state.sosCreateCalls[0].data, {
    code: 'SOS0410001',
    user_id: 'user-id',
    site_id: 'site-1',
    latitude: 16.3001,
    longitude: 107.5902,
    message: 'Need urgent help',
    contact_phone: '0911111111',
    status: 'pending',
  });
  assert.equal(state.createNotificationCalls.filter(([type]) => type === 'sos_created').length, 2);
  assert.equal(state.createNotificationCalls.filter(([type]) => type === 'sos_planner_alert').length, 2);
  assert.equal(state.plannerMessageCreateCalls.length, 1);
  assert.equal(state.plannerMessageCreateCalls[0].data.message_type, 'sos_alert');
  assert.ok(state.plannerMessageCreateCalls[0].data.content.includes('SOS0410001'));
  assert.equal(state.notifySiteManagerCalls.length, 0);
  assert.equal(result.code, 'SOS0410001');
  assert.equal(result.site.name, 'La Vang Shrine');
});

test('UTCID02: createSOS falls back to notifying the site manager when no on-duty guide is available', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Two',
      phone: '0922222222',
    }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-2',
      name: 'Tra Kieu Shrine',
    }),
    sosFindOne: async () => null,
    sosCreate: async (data) => ({
      id: 'sos-2',
      code: data.code,
      user_id: data.user_id,
      site_id: data.site_id,
      status: data.status,
    }),
    sosFindByPk: async () => ({
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'pending',
      site: {
        id: 'site-2',
        name: 'Tra Kieu Shrine',
        address: 'Quang Nam',
      },
    }),
    plannerMemberFindAll: async () => [],
    plannerFindAll: async () => [],
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410002');
  stubPilgrimSOSMethod(PilgrimSOSService, 'findOnDutyGuides', async () => []);

  const result = await PilgrimSOSService.createSOS('user-id', {
    site_id: 'site-2',
    latitude: 15.8001,
    longitude: 108.1002,
    message: 'Need support nearby',
  });

  assert.equal(state.createNotificationCalls.length, 0);
  assert.equal(state.notifySiteManagerCalls.length, 1);
  assert.equal(state.notifySiteManagerCalls[0][0], 'site-2');
  assert.equal(state.notifySiteManagerCalls[0][1], 'sos_created');
  assert.equal(state.plannerMessageCreateCalls.length, 0);
  assert.equal(result.code, 'SOS0410002');
});

test('UTCID03: createSOS allows SOS creation without site_id and keeps provided contact phone', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Three',
      phone: '0933333333',
    }),
    sosFindOne: async () => null,
    sosCreate: async (data) => ({
      id: 'sos-3',
      code: data.code,
      user_id: data.user_id,
      site_id: data.site_id,
      contact_phone: data.contact_phone,
      status: data.status,
    }),
    sosFindByPk: async () => ({
      id: 'sos-3',
      code: 'SOS0410003',
      status: 'pending',
      site: null,
    }),
    plannerMemberFindAll: async () => [],
    plannerFindAll: async () => [],
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410003');

  const result = await PilgrimSOSService.createSOS('user-id', {
    latitude: 10.8001,
    longitude: 106.7002,
    message: 'Standalone SOS',
    contact_phone: '0999999999',
  });

  assert.deepEqual(state.sosCreateCalls[0].data, {
    code: 'SOS0410003',
    user_id: 'user-id',
    site_id: null,
    latitude: 10.8001,
    longitude: 106.7002,
    message: 'Standalone SOS',
    contact_phone: '0999999999',
    status: 'pending',
  });
  assert.equal(state.siteFindByPkCalls.length, 0);
  assert.equal(state.createNotificationCalls.length, 0);
  assert.equal(state.notifySiteManagerCalls.length, 0);
  assert.equal(result.site, null);
});

test('UTCID04: createSOS throws when authenticated user does not exist', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('missing-user-id', {
      site_id: 'site-1',
      latitude: 16.1,
      longitude: 107.1,
      message: 'Help',
    }),
    { message: 'User not found' }
  );

  assert.equal(state.sosCreateCalls.length, 0);
});

test('UTCID05: createSOS throws when site_id is provided but the site does not exist', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Five',
    }),
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', {
      site_id: 'missing-site',
      latitude: 16.5,
      longitude: 107.5,
      message: 'Help at site',
    }),
    { message: 'Site not found' }
  );

  assert.equal(state.sosCreateCalls.length, 0);
});

test('UTCID06: createSOS throws when the pilgrim already has a pending SOS request', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Six',
    }),
    siteFindByPk: async () => createSiteRecord({ id: 'site-6' }),
    sosFindOne: async () => ({
      id: 'existing-sos',
      code: 'SOS0410999',
      status: 'pending',
    }),
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', {
      site_id: 'site-6',
      latitude: 16.6,
      longitude: 107.6,
      message: 'Duplicate SOS',
    }),
    { message: 'already_pending' }
  );

  assert.equal(state.sosCreateCalls.length, 0);
});

test('UTCID07: createSOS rejects when pilgrim is more than 1km away from the selected site', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Seven',
      phone: '0977777777',
    }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-7',
      name: 'La Vang Shrine',
      latitude: '16.300000',
      longitude: '107.590000',
    }),
    sosFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', {
      site_id: 'site-7',
      latitude: 16.3200,
      longitude: 107.5900,
      message: 'Too far SOS',
    }),
    {
      message: /sos_too_far:\d+/,
    }
  );

  assert.equal(state.sosCreateCalls.length, 0);
  assert.equal(state.createNotificationCalls.length, 0);
});

test('UTCID08: createSOS accepts when pilgrim is within 1km of the selected site', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Eight',
      phone: '0988888888',
    }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-8',
      name: 'La Vang Shrine',
      latitude: '16.300000',
      longitude: '107.590000',
    }),
    sosFindOne: async () => null,
    sosCreate: async (data) => ({
      id: 'sos-8',
      code: data.code,
      user_id: data.user_id,
      site_id: data.site_id,
      status: data.status,
      latitude: data.latitude,
      longitude: data.longitude,
      message: data.message,
      contact_phone: data.contact_phone,
    }),
    sosFindByPk: async () => ({
      id: 'sos-8',
      code: 'SOS0410008',
      status: 'pending',
      site: {
        id: 'site-8',
        name: 'La Vang Shrine',
        address: 'Hue',
      },
    }),
    plannerMemberFindAll: async () => [],
    plannerFindAll: async () => [],
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410008');
  stubPilgrimSOSMethod(PilgrimSOSService, 'findOnDutyGuides', async () => []);

  const result = await PilgrimSOSService.createSOS('user-id', {
    site_id: 'site-8',
    latitude: 16.3045,
    longitude: 107.5900,
    message: 'Nearby SOS',
  });

  assert.equal(state.sosCreateCalls.length, 1);
  assert.equal(state.notifySiteManagerCalls.length, 1);
  assert.equal(result.code, 'SOS0410008');
});

test('UTCID09: createSOS skips distance validation when selected site has no coordinates', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Nine',
      phone: '0999999999',
    }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-9',
      name: 'Unknown Coordinate Site',
      latitude: null,
      longitude: null,
    }),
    sosFindOne: async () => null,
    sosCreate: async (data) => ({
      id: 'sos-9',
      code: data.code,
      user_id: data.user_id,
      site_id: data.site_id,
      status: data.status,
      latitude: data.latitude,
      longitude: data.longitude,
      message: data.message,
      contact_phone: data.contact_phone,
    }),
    sosFindByPk: async () => ({
      id: 'sos-9',
      code: 'SOS0410009',
      status: 'pending',
      site: {
        id: 'site-9',
        name: 'Unknown Coordinate Site',
        address: 'N/A',
      },
    }),
    plannerMemberFindAll: async () => [],
    plannerFindAll: async () => [],
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410009');
  stubPilgrimSOSMethod(PilgrimSOSService, 'findOnDutyGuides', async () => []);

  const result = await PilgrimSOSService.createSOS('user-id', {
    site_id: 'site-9',
    latitude: 10.8001,
    longitude: 106.7002,
    message: 'Site missing coordinates SOS',
  });

  assert.equal(state.sosCreateCalls.length, 1);
  assert.equal(result.code, 'SOS0410009');
});

test('UTCID10: createSOS blocks SOS when site is closed and no events are active', async (t) => {
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T19:00:00Z') }); // 02:00 next day local time
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-10',
      opening_hours: { open: '08:00', close: '18:00' }
    }),
    eventFindAll: async () => [],
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', {
      site_id: 'site-10', latitude: 16.3001, longitude: 107.5902, message: 'Help at night'
    }),
    { message: 'sos_outside_operating_hours' }
  );
});

test('UTCID11: createSOS allows SOS when site is closed but an event is ongoing cross-midnight', async (t) => {
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T19:00:00Z') }); // 02:00 Local time 11th April
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-11',
      opening_hours: { open: '08:00', close: '20:00' }
    }),
    eventFindAll: async () => ([
      {
        start_date: '2026-04-10',
        end_date: '2026-04-12',
        start_time: '23:00',
        end_time: '04:00',
      }
    ]),
    sosFindByPk: async () => ({ id: 'sos-11', status: 'pending', site: { id: 'site-11' } })
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0411001');
  const result = await PilgrimSOSService.createSOS('user-id', { site_id: 'site-11', latitude: 16.3, longitude: 107.5 });
  assert.equal(state.sosCreateCalls.length, 1);
});

test('UTCID12: createSOS allows SOS when site is open via weekday map', async (t) => {
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T03:00:00Z') }); // Friday 10:00 AM VN time
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-12',
      opening_hours: { friday: '08:00-18:00' }
    }),
    sosFindByPk: async () => ({ id: 'sos-12', status: 'pending', site: { id: 'site-12' } })
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0410002');
  const result = await PilgrimSOSService.createSOS('user-id', { site_id: 'site-12', latitude: 16.3, longitude: 107.5 });
  assert.equal(state.sosCreateCalls.length, 1);
});

test('UTCID13: createSOS blocks SOS when site has cross-midnight operating hours but current time is out of bounds', async (t) => {
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T03:00:00Z') }); // 10:00 AM local
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-13',
      opening_hours: { open: '22:00', close: '04:00' } // open only at night
    }),
    eventFindAll: async () => [],
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', { site_id: 'site-13', latitude: 16.3, longitude: 107.5 }),
    { message: 'sos_outside_operating_hours' }
  );
});

test('UTCID14: createSOS blocks SOS when weekday map has no entry for today', async (t) => {
  // 2026-04-10 is Friday. Site only has "monday" key → Friday should be CLOSED
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T03:00:00Z') }); // Fri 10:00 AM VN
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-14',
      opening_hours: { monday: '08:00-18:00' } // no friday key!
    }),
    eventFindAll: async () => [],
  });

  await assert.rejects(
    PilgrimSOSService.createSOS('user-id', { site_id: 'site-14', latitude: 16.3, longitude: 107.5 }),
    { message: 'sos_outside_operating_hours' }
  );
});

test('UTCID15: createSOS allows SOS at 02:00 Saturday if friday schedule is cross-midnight 22:00-04:00', async (t) => {
  // 2026-04-11 is Saturday, 02:00 AM VN → Friday's 22:00-04:00 should still cover this
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T19:00:00Z') }); // Sat 02:00 AM VN
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-15',
      opening_hours: { friday: '22:00-04:00' } // cross-midnight, no saturday key
    }),
    sosFindByPk: async () => ({ id: 'sos-15', status: 'pending', site: { id: 'site-15' } }),
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0411015');
  const result = await PilgrimSOSService.createSOS('user-id', { site_id: 'site-15', latitude: 16.3, longitude: 107.5 });
  assert.equal(state.sosCreateCalls.length, 1);
});

test('UTCID16: createSOS allows SOS at 01:00 when single-day cross-midnight event spills into next day', async (t) => {
  // Event: start_date=2026-04-10, end_date=null, 23:00->02:00. SOS at 2026-04-11 01:00 VN should pass
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T18:00:00Z') }); // 2026-04-11 01:00 VN
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-16',
      opening_hours: { open: '08:00', close: '17:00' } // closed at 01:00
    }),
    eventFindAll: async () => ([
      {
        start_date: '2026-04-10',
        end_date: null, // single-day event!
        start_time: '23:00',
        end_time: '02:00',
      }
    ]),
    sosFindByPk: async () => ({ id: 'sos-16', status: 'pending', site: { id: 'site-16' } }),
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0411016');
  const result = await PilgrimSOSService.createSOS('user-id', { site_id: 'site-16', latitude: 16.3, longitude: 107.5 });
  assert.equal(state.sosCreateCalls.length, 1);
});

test('UTCID17: createSOS allows SOS during yesterday spill-over even when today also has its own daytime opening hours', async (t) => {
  // Saturday 02:00 AM VN: Friday 22:00-04:00 is still active, even though Saturday has 08:00-18:00
  if (t && t.mock && t.mock.timers) t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-04-10T19:00:00Z') });
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    userFindByPk: async () => createUserRecord({ id: 'user-id' }),
    siteFindByPk: async () => createSiteRecord({
      id: 'site-17',
      opening_hours: {
        friday: '22:00-04:00',
        saturday: '08:00-18:00'
      }
    }),
    sosFindByPk: async () => ({ id: 'sos-17', status: 'pending', site: { id: 'site-17' } }),
  });

  stubPilgrimSOSMethod(PilgrimSOSService, 'generateSOSCode', async () => 'SOS0411017');
  const result = await PilgrimSOSService.createSOS('user-id', { site_id: 'site-17', latitude: 16.3, longitude: 107.5 });
  assert.equal(state.sosCreateCalls.length, 1);
});
