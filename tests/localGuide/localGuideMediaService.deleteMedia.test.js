const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: deleteMedia soft deletes pending media successfully', async () => {
  const { LocalGuideMediaService, state, createMediaInstance } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => createMediaInstance({
      id: 'media-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      is_active: true,
    }),
  });

  const result = await LocalGuideMediaService.deleteMedia('guide-id', 'media-id');

  assert.equal(result.message, 'Media deleted successfully');
  assert.equal(state.mediaInstanceUpdateCalls[0].values.is_active, false);
});

test('UTCID02: deleteMedia rejects when media is not found', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideMediaService.deleteMedia('guide-id', 'missing-media-id'),
    { message: 'Media not found' }
  );
});

test('UTCID03: deleteMedia rejects approved media', async () => {
  const { LocalGuideMediaService, createMediaInstance } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => createMediaInstance({
      id: 'media-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'approved',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.deleteMedia('guide-id', 'media-id'),
    { message: 'Cannot delete approved media' }
  );
});

test('UTCID04: deleteMedia rejects unauthorized user', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.deleteMedia('manager-id', 'media-id'),
    { message: 'Unauthorized' }
  );
});
