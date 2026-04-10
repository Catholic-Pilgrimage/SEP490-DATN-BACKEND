const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSiteService,
  createSiteRecord,
} = require('./_siteTestHelper');

test('UTCID01: addFavorite creates a new favorite for an active site', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'La Vang Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => null,
  });

  const result = await PilgrimSiteService.addFavorite('user-id', 'site-1');

  assert.equal(state.siteFindByPkCalls.length, 1);
  assert.equal(state.siteFindByPkCalls[0].siteId, 'site-1');
  assert.deepEqual(state.userFavoriteFindOneCalls[0].where, {
    user_id: 'user-id',
    site_id: 'site-1',
  });
  assert.deepEqual(state.userFavoriteCreateCalls[0], {
    user_id: 'user-id',
    site_id: 'site-1',
  });
  assert.deepEqual(result, {
    site_id: 'site-1',
    site_name: 'La Vang Shrine',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'User user-id favorited site site-1');
});

test('UTCID02: addFavorite throws when the site does not exist', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    PilgrimSiteService.addFavorite('user-id', 'missing-site'),
    { message: 'Site not found' }
  );

  assert.equal(state.userFavoriteFindOneCalls.length, 0);
  assert.equal(state.userFavoriteCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Add favorite error:');
});

test('UTCID03: addFavorite throws when the site is inactive', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'Inactive Shrine',
      is_active: false,
    }),
  });

  await assert.rejects(
    PilgrimSiteService.addFavorite('user-id', 'inactive-site'),
    { message: 'Site not active' }
  );

  assert.equal(state.userFavoriteFindOneCalls.length, 0);
  assert.equal(state.userFavoriteCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Add favorite error:');
});

test('UTCID04: addFavorite throws when the site has already been favorited', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'Tra Kieu Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => ({
      user_id: 'user-id',
      site_id: 'site-4',
      created_at: new Date('2026-04-10T00:00:00.000Z'),
    }),
  });

  await assert.rejects(
    PilgrimSiteService.addFavorite('user-id', 'site-4'),
    { message: 'Already favorited' }
  );

  assert.equal(state.userFavoriteCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Add favorite error:');
});

test('UTCID05: addFavorite logs and rethrows database errors during favorite creation', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'Database Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => null,
    userFavoriteCreate: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSiteService.addFavorite('user-id', 'site-5'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Add favorite error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
