const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadManagerSOSService,
  createUserRecord,
  createSiteRecord,
  createSOSRecord,
} = require('./_managerSOSTestHelper');

test('UTCID01: assignGuide assigns a pending SOS to a valid guide and sends both notifications', async () => {
  const { ManagerSOSService, state } = loadManagerSOSService({
    userFindByPk: async (userId) => {
      if (userId === 'manager-id') {
        return createUserRecord({
          id: 'manager-id',
          role: 'manager',
          site_id: 'site-1',
        });
      }

      if (userId === 'guide-id') {
        return createUserRecord({
          id: 'guide-id',
          role: 'local_guide',
          status: 'active',
          site_id: 'site-1',
          full_name: 'Guide One',
          phone: '0900000001',
        });
      }

      return null;
    },
    sosFindOne: async () => createSOSRecord({
      id: 'sos-1',
      code: 'SOS0411001',
      status: 'pending',
      site_id: 'site-1',
      user_id: 'pilgrim-1',
      message: 'Need urgent help',
    }),
    sosFindByPk: async (sosId, options) => {
      if (options?.attributes) {
        return { id: sosId, status: 'accepted' };
      }

      return {
        id: 'sos-1',
        code: 'SOS0411001',
        status: 'accepted',
        message: 'Need urgent help',
        user_id: 'pilgrim-1',
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
      };
    },
  });

  const result = await ManagerSOSService.assignGuide('manager-id', 'sos-1', 'guide-id');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    site_id: 'site-1',
  });
  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.sosUpdateCalls[0].values.status, 'accepted');
  assert.equal(state.sosUpdateCalls[0].values.assigned_to, 'guide-id');
  assert.ok(state.sosUpdateCalls[0].values.assigned_at instanceof Date);
  assert.deepEqual(state.sosUpdateCalls[0].options.where, {
    id: 'sos-1',
    status: 'pending',
  });
  assert.equal(state.createNotificationCalls.length, 2);
  assert.equal(state.createNotificationCalls[0][0], 'sos_assigned_to_guide');
  assert.equal(state.createNotificationCalls[0][1], 'guide-id');
  assert.deepEqual(state.createNotificationCalls[0][2], {
    siteName: 'La Vang Shrine',
    sosCode: 'SOS0411001',
    pilgrimName: 'Pilgrim One',
    message: 'Need urgent help',
  });
  assert.equal(state.createNotificationCalls[1][0], 'sos_assigned');
  assert.equal(state.createNotificationCalls[1][1], 'pilgrim-1');
  assert.deepEqual(state.createNotificationCalls[1][2], {
    guideName: 'Guide One',
    guidePhone: '0900000001',
  });
  assert.equal(result.status, 'accepted');
  assert.equal(result.assignedGuide.full_name, 'Guide One');
});

test('UTCID02: assignGuide rejects a guide from another site', async () => {
  const { ManagerSOSService, state } = loadManagerSOSService({
    userFindByPk: async (userId) => {
      if (userId === 'manager-id') {
        return createUserRecord({
          id: 'manager-id',
          role: 'manager',
          site_id: 'site-1',
        });
      }

      if (userId === 'guide-id') {
        return createUserRecord({
          id: 'guide-id',
          role: 'local_guide',
          status: 'active',
          site_id: 'site-2',
        });
      }

      return null;
    },
    sosFindOne: async () => createSOSRecord({
      id: 'sos-2',
      code: 'SOS0411002',
      status: 'pending',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerSOSService.assignGuide('manager-id', 'sos-2', 'guide-id'),
    { message: 'guide_not_same_site' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
  assert.equal(state.createNotificationCalls.length, 0);
});

test('UTCID03: assignGuide throws already_accepted when the SOS is no longer pending before assignment', async () => {
  const { ManagerSOSService, state } = loadManagerSOSService({
    userFindByPk: async (userId) => {
      if (userId === 'manager-id') {
        return createUserRecord({
          id: 'manager-id',
          role: 'manager',
          site_id: 'site-1',
        });
      }
      return null;
    },
    sosFindOne: async () => createSOSRecord({
      id: 'sos-3',
      code: 'SOS0411003',
      status: 'accepted',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerSOSService.assignGuide('manager-id', 'sos-3', 'guide-id'),
    { message: 'already_accepted' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
});

test('UTCID04: assignGuide handles a lost pending race by re-reading status and returning already_accepted', async () => {
  const { ManagerSOSService, state } = loadManagerSOSService({
    userFindByPk: async (userId) => {
      if (userId === 'manager-id') {
        return createUserRecord({
          id: 'manager-id',
          role: 'manager',
          site_id: 'site-1',
        });
      }

      if (userId === 'guide-id') {
        return createUserRecord({
          id: 'guide-id',
          role: 'local_guide',
          status: 'active',
          site_id: 'site-1',
          full_name: 'Guide One',
          phone: '0900000001',
        });
      }

      return null;
    },
    sosFindOne: async () => createSOSRecord({
      id: 'sos-4',
      code: 'SOS0411004',
      status: 'pending',
      site_id: 'site-1',
    }),
    sosUpdate: async () => [0],
    sosFindByPk: async () => ({ status: 'accepted' }),
  });

  await assert.rejects(
    ManagerSOSService.assignGuide('manager-id', 'sos-4', 'guide-id'),
    { message: 'already_accepted' }
  );

  assert.equal(state.createNotificationCalls.length, 0);
  assert.equal(state.sosFindByPkCalls.length, 1);
  assert.deepEqual(state.sosFindByPkCalls[0].options.attributes, ['status']);
});
