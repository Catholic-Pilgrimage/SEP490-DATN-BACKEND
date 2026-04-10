const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideMediaService } = require('./_localGuideTestHelper');

test('UTCID01: updateMedia updates pending media caption and YouTube URL successfully', async () => {
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
      type: 'video',
      caption: 'Old caption',
      url: 'https://www.youtube.com/watch?v=old',
      is_active: true,
    }),
  });

  const result = await LocalGuideMediaService.updateMedia('guide-id', 'media-id', {
    caption: 'New caption',
    url: 'https://www.youtube.com/watch?v=newid123',
  });

  assert.equal(result.caption, 'New caption');
  assert.equal(result.url, 'https://www.youtube.com/watch?v=newid123');
  assert.equal(state.mediaInstanceUpdateCalls[0].values.caption, 'New caption');
});

test('UTCID02: updateMedia resets rejected media back to pending', async () => {
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
      status: 'rejected',
      rejection_reason: 'Bad quality',
      type: 'image',
      caption: 'Old caption',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/site.jpg',
      is_active: true,
    }),
  });

  const result = await LocalGuideMediaService.updateMedia('guide-id', 'media-id', {
    caption: 'Retried upload',
  });

  assert.equal(result.status, 'pending');
  assert.equal(result.rejection_reason, null);
});

test('UTCID03: updateMedia rejects when media is not found', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteMediaFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideMediaService.updateMedia('guide-id', 'missing-media-id', {
      caption: 'Nothing',
    }),
    { message: 'Media not found' }
  );
});

test('UTCID04: updateMedia rejects approved media', async () => {
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
      type: 'image',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/site.jpg',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.updateMedia('guide-id', 'media-id', {
      caption: 'Updated caption',
    }),
    { message: 'Cannot update approved media' }
  );
});

test('UTCID05: updateMedia rejects invalid YouTube URL for video media', async () => {
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
      type: 'video',
      url: 'https://www.youtube.com/watch?v=old',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.updateMedia('guide-id', 'media-id', {
      url: 'https://vimeo.com/123456',
    }),
    { message: 'Invalid YouTube URL' }
  );
});

test('UTCID06: updateMedia rejects unauthorized user', async () => {
  const { LocalGuideMediaService } = loadLocalGuideMediaService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideMediaService.updateMedia('pilgrim-id', 'media-id', {
      caption: 'No access',
    }),
    { message: 'Unauthorized' }
  );
});
