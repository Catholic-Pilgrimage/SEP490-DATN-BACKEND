const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: getSiteMedia returns paginated media created by local guide', async () => {
  const mediaRows = [{ id: 'm-2' }, { id: 'm-1' }];
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 2,
    siteMediaFindAll: async () => mediaRows,
  });

  const result = await LocalGuideMediaService.getSiteMedia('guide-id');

  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.totalItems, 2);
  assert.deepEqual(result.data, mediaRows);
});

test('UTCID02: getSiteMedia applies type and status filters', async () => {
  const { LocalGuideMediaService, state } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 1,
    siteMediaFindAll: async () => [{ id: 'm-1', type: 'image', status: 'approved' }],
  });

  await LocalGuideMediaService.getSiteMedia('guide-id', {
    type: 'image',
    status: 'approved',
    page: 2,
    limit: 5,
  });

  const countWhere = state.siteMediaCountCalls[0].where;
  assert.equal(countWhere.type, 'image');
  assert.equal(countWhere.status, 'approved');
});

test('UTCID03: getSiteMedia filters narrative_status null correctly', async () => {
  const { LocalGuideMediaService, state } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 1,
    siteMediaFindAll: async () => [{ id: 'm-1', narrative_status: null }],
  });

  await LocalGuideMediaService.getSiteMedia('guide-id', {
    narrative_status: 'null',
  });

  assert.equal(state.siteMediaCountCalls[0].where.narrative_status, null);
});

test('UTCID04: getSiteMedia filters inactive media explicitly', async () => {
  const { LocalGuideMediaService, state } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaCount: async () => 1,
    siteMediaFindAll: async () => [{ id: 'm-1', is_active: false }],
  });

  await LocalGuideMediaService.getSiteMedia('guide-id', {
    is_active: 'false',
  });

  assert.equal(state.siteMediaCountCalls[0].where.is_active, false);
});

test('UTCID05: getSiteMedia rejects unauthorized user', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.getSiteMedia('manager-id'),
    { message: 'Unauthorized' }
  );
});
