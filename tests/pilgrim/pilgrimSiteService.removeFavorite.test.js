const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSiteService,
  createSiteRecord,
} = require('./_siteTestHelper');

test('UTCID01: removeFavorite deletes an existing favorite for a valid site', async () => {
  const { PilgrimSiteService, state, createFavoriteRecord } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'La Vang Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => createFavoriteRecord({
      user_id: 'user-id',
      site_id: 'site-1',
    }),
  });

  const result = await PilgrimSiteService.removeFavorite('user-id', 'site-1');

  assert.equal(state.siteFindByPkCalls.length, 1);
  assert.equal(state.siteFindByPkCalls[0].siteId, 'site-1');
  assert.deepEqual(state.userFavoriteFindOneCalls[0].where, {
    user_id: 'user-id',
    site_id: 'site-1',
  });
  assert.deepEqual(state.userFavoriteDestroyCalls[0], {
    user_id: 'user-id',
    site_id: 'site-1',
  });
  assert.deepEqual(result, {
    site_id: 'site-1',
    site_name: 'La Vang Shrine',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'User user-id unfavorited site site-1');
});

test('UTCID02: removeFavorite throws when the site does not exist', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    PilgrimSiteService.removeFavorite('user-id', 'missing-site'),
    { message: 'Site not found' }
  );

  assert.equal(state.userFavoriteFindOneCalls.length, 0);
  assert.equal(state.userFavoriteDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Remove favorite error:');
});

test('UTCID03: removeFavorite throws when the favorite record does not exist', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'Tra Kieu Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSiteService.removeFavorite('user-id', 'site-3'),
    { message: 'Not favorited' }
  );

  assert.equal(state.userFavoriteDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Remove favorite error:');
});

test('UTCID04: removeFavorite logs and rethrows database errors during favorite deletion', async () => {
  const { PilgrimSiteService, state, createFavoriteRecord } = loadPilgrimSiteService({
    siteFindByPk: async (siteId) => createSiteRecord({
      id: siteId,
      name: 'Database Shrine',
      is_active: true,
    }),
    userFavoriteFindOne: async () => createFavoriteRecord({
      user_id: 'user-id',
      site_id: 'site-4',
    }),
    userFavoriteDestroy: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSiteService.removeFavorite('user-id', 'site-4'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.userFavoriteDestroyCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Remove favorite error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
