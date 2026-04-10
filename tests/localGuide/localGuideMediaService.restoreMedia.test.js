const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: restoreMedia restores inactive pending media successfully', async () => {
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
      type: 'image',
      is_active: false,
    }),
  });

  const result = await LocalGuideMediaService.restoreMedia('guide-id', 'media-id');

  assert.equal(result.is_active, true);
  assert.equal(state.mediaInstanceUpdateCalls[0].values.is_active, true);
});

test('UTCID02: restoreMedia rejects when media is not found', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideMediaService.restoreMedia('guide-id', 'missing-media-id'),
    { message: 'Media not found' }
  );
});

test('UTCID03: restoreMedia rejects approved media', async () => {
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
      is_active: false,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.restoreMedia('guide-id', 'media-id'),
    { message: 'Cannot restore approved media' }
  );
});

test('UTCID04: restoreMedia rejects already active media', async () => {
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
      status: 'pending',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.restoreMedia('guide-id', 'media-id'),
    { message: 'Media is already active' }
  );
});

test('UTCID05: restoreMedia deactivates other 3D models before restoring current model', async () => {
  const { LocalGuideMediaService, state, createMediaInstance } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => createMediaInstance({
      id: 'model-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      type: 'model_3d',
      is_active: false,
    }),
  });

  const result = await LocalGuideMediaService.restoreMedia('guide-id', 'model-id');

  assert.equal(result.is_active, true);
  assert.equal(state.transactionCalls, 1);
  assert.equal(state.siteMediaStaticUpdateCalls[0].values.is_active, false);
  assert.equal(state.mediaInstanceUpdateCalls[0].values.is_active, true);
});
