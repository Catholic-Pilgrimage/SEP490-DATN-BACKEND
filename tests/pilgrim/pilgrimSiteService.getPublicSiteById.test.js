const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSiteService,
  createSiteRecord,
} = require('./_siteTestHelper');

test('UTCID01: getPublicSiteById returns active public site detail when queried by UUID', async () => {
  const siteId = '123e4567-e89b-12d3-a456-426614174000';
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindOne: async () => createSiteRecord({
      id: siteId,
      code: 'SITE001',
      name: 'La Vang Shrine',
      history: 'Historic pilgrimage destination',
      contact_info: '0123456789',
    }),
  });

  const result = await PilgrimSiteService.getPublicSiteById(siteId);

  assert.deepEqual(state.siteFindOneCalls[0].where, {
    id: siteId,
    is_active: true,
  });
  assert.equal(result.id, siteId);
  assert.equal(result.name, 'La Vang Shrine');
  assert.equal(result.history, 'Historic pilgrimage destination');
});

test('UTCID02: getPublicSiteById returns active public site detail when queried by code', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindOne: async () => createSiteRecord({
      id: 'site-2',
      code: 'TRAKIEU',
      name: 'Tra Kieu Shrine',
      province: 'Quang Nam',
    }),
  });

  const result = await PilgrimSiteService.getPublicSiteById('TRAKIEU');

  assert.deepEqual(state.siteFindOneCalls[0].where, {
    code: 'TRAKIEU',
    is_active: true,
  });
  assert.equal(result.code, 'TRAKIEU');
  assert.equal(result.province, 'Quang Nam');
});

test('UTCID03: getPublicSiteById throws Site not found when the active site does not exist by UUID', async () => {
  const siteId = '123e4567-e89b-12d3-a456-426614174999';
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSiteService.getPublicSiteById(siteId),
    { message: 'Site not found' }
  );

  assert.deepEqual(state.siteFindOneCalls[0].where, {
    id: siteId,
    is_active: true,
  });
});

test('UTCID04: getPublicSiteById throws Site not found when the site code is inactive or missing', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSiteService.getPublicSiteById('INACTIVE01'),
    { message: 'Site not found' }
  );

  assert.deepEqual(state.siteFindOneCalls[0].where, {
    code: 'INACTIVE01',
    is_active: true,
  });
});

test('UTCID05: getPublicSiteById logs and rethrows database errors', async () => {
  const { PilgrimSiteService, state } = loadPilgrimSiteService({
    siteFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PilgrimSiteService.getPublicSiteById('SITE005'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get public site by ID error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
