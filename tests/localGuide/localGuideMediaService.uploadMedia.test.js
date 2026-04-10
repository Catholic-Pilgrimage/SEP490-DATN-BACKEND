const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: uploadMedia uploads image successfully for assigned local guide', async () => {
  const { LocalGuideMediaService, state } = loadLocalGuideMediaService({
    userFindByPk: async (userId) => ({
      id: userId,
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Guide One',
      email: 'guide@example.com',
    }),
  });

  LocalGuideMediaService.generateMediaCode = async () => 'IMG0326001';

  const result = await LocalGuideMediaService.uploadMedia('guide-id', {
    url: 'https://res.cloudinary.com/demo/image/upload/v1/site.jpg',
    type: 'image',
    caption: 'Main gate',
  });

  assert.equal(result.code, 'IMG0326001');
  assert.equal(result.type, 'image');
  assert.equal(result.status, 'pending');
  assert.equal(state.siteMediaCreateCalls[0].site_id, 'site-1');
  assert.deepEqual(state.notificationCalls[0], ['site-1', 'media_submitted', { guideName: 'Guide One' }]);
});

test('UTCID02: uploadMedia accepts valid YouTube URL for video media', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Guide One',
      email: 'guide@example.com',
    }),
  });

  LocalGuideMediaService.generateMediaCode = async () => 'VID0326001';

  const result = await LocalGuideMediaService.uploadMedia('guide-id', {
    url: 'https://www.youtube.com/watch?v=abc123XYZ',
    type: 'video',
    caption: 'Site intro',
  });

  assert.equal(result.code, 'VID0326001');
  assert.equal(result.type, 'video');
});

test('UTCID03: uploadMedia rejects unauthorized user', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.uploadMedia('manager-id', {
      url: 'https://example.com/a.jpg',
      type: 'image',
    }),
    { message: 'Unauthorized' }
  );
});

test('UTCID04: uploadMedia rejects local guide without site assignment', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.uploadMedia('guide-id', {
      url: 'https://example.com/a.jpg',
      type: 'image',
    }),
    { message: 'Local Guide has no site' }
  );
});

test('UTCID05: uploadMedia rejects invalid media type', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.uploadMedia('guide-id', {
      url: 'https://example.com/model.glb',
      type: 'model_3d',
    }),
    { message: 'Invalid media type' }
  );
});

test('UTCID06: uploadMedia rejects invalid YouTube URL for non-cloudinary video', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.uploadMedia('guide-id', {
      url: 'https://vimeo.com/123456',
      type: 'video',
    }),
    { message: 'Invalid YouTube URL' }
  );
});
