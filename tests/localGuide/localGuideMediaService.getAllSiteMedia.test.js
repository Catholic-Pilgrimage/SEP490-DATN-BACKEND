const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: getAllSiteMedia returns approved active media for local guide site', async () => {
  const rows = [{ id: 'm-1', status: 'approved', is_active: true }];
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 1,
    siteMediaFindAll: async () => rows,
  });

  const result = await LocalGuideMediaService.getAllSiteMedia('guide-id');

  assert.equal(result.pagination.totalItems, 1);
  assert.deepEqual(result.data, rows);
});

test('UTCID02: getAllSiteMedia applies type filter', async () => {
  const { LocalGuideMediaService, state } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 1,
    siteMediaFindAll: async () => [{ id: 'm-1', type: 'video' }],
  });

  await LocalGuideMediaService.getAllSiteMedia('guide-id', {
    type: 'video',
    page: 2,
    limit: 5,
  });

  assert.equal(state.siteMediaCountCalls[0].where.type, 'video');
  assert.equal(state.siteMediaCountCalls[0].where.status, 'approved');
  assert.equal(state.siteMediaCountCalls[0].where.is_active, true);
});

test('UTCID03: getAllSiteMedia returns pagination metadata correctly', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 6,
    siteMediaFindAll: async () => [{ id: 'm-1' }],
  });

  const result = await LocalGuideMediaService.getAllSiteMedia('guide-id', {
    page: 2,
    limit: 5,
  });

  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.limit, 5);
  assert.equal(result.pagination.totalPages, 2);
});

test('UTCID04: getAllSiteMedia rejects unauthorized user', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.getAllSiteMedia('pilgrim-id'),
    { message: 'Unauthorized' }
  );
});
