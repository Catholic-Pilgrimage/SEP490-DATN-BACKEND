const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPostService, createPostInstance } = require('./_postTestHelper');

function stubGetPostById(PostService, implementation) {
  PostService.getPostById = implementation;
}

test('UTCID01: createPost creates a standalone community post with media successfully', async () => {
  const { PostService, state } = loadPostService();

  stubGetPostById(PostService, async (postId, userId) => ({
    id: postId,
    user_id: userId,
    title: 'Blessed Journey',
    content: 'A peaceful day at La Vang.',
    image_urls: ['https://cdn.example.com/p1.jpg'],
    audio_url: 'https://cdn.example.com/p1.mp3',
    video_url: 'https://cdn.example.com/p1.mp4',
    site_id: null,
    status: 'published',
  }));

  const result = await PostService.createPost('user-id', {
    title: '  Blessed Journey  ',
    content: 'A peaceful day at La Vang.',
    image_urls: ['https://cdn.example.com/p1.jpg'],
    audio_url: 'https://cdn.example.com/p1.mp3',
    video_url: 'https://cdn.example.com/p1.mp4',
  });

  assert.equal(state.userCheckinFindOneCalls.length, 0);
  assert.deepEqual(state.postCreateCalls[0].data, {
    user_id: 'user-id',
    title: 'Blessed Journey',
    content: 'A peaceful day at La Vang.',
    image_urls: ['https://cdn.example.com/p1.jpg'],
    audio_url: 'https://cdn.example.com/p1.mp3',
    video_url: 'https://cdn.example.com/p1.mp4',
    site_id: null,
    status: 'published',
  });
  assert.equal(result.title, 'Blessed Journey');
  assert.equal(result.status, 'published');
});

test('UTCID02: createPost creates a tagged site post after check-in validation succeeds', async () => {
  const { PostService, state } = loadPostService({
    userCheckinFindOne: async () => ({ id: 'checkin-id' }),
  });

  stubGetPostById(PostService, async (postId, userId) => ({
    id: postId,
    user_id: userId,
    title: 'Site Reflection',
    content: 'Visited the holy site today.',
    site_id: 'site-1',
    status: 'published',
  }));

  const result = await PostService.createPost('user-id', {
    title: 'Site Reflection',
    content: 'Visited the holy site today.',
    site_id: 'site-1',
  });

  assert.equal(state.userCheckinFindOneCalls.length, 1);
  assert.deepEqual(state.userCheckinFindOneCalls[0], {
    where: { user_id: 'user-id' },
    include: [{
      model: {},
      as: 'plannerItem',
      where: { site_id: 'site-1' },
      required: true,
    }],
  });
  assert.equal(state.postCreateCalls[0].data.site_id, 'site-1');
  assert.equal(result.site_id, 'site-1');
});

test('UTCID03: createPost normalizes a blank title to null and defaults media fields', async () => {
  const { PostService, state } = loadPostService({
    postCreate: async (data, options, helperState) => createPostInstance({
      id: 'post-boundary-id',
      ...data,
    }, helperState),
  });

  stubGetPostById(PostService, async (postId) => ({
    id: postId,
    title: null,
    content: 'Prayer notes',
    image_urls: [],
    audio_url: null,
    video_url: null,
    site_id: null,
    status: 'published',
  }));

  const result = await PostService.createPost('user-id', {
    title: '   ',
    content: 'Prayer notes',
  });

  assert.deepEqual(state.postCreateCalls[0].data, {
    user_id: 'user-id',
    title: null,
    content: 'Prayer notes',
    image_urls: [],
    audio_url: null,
    video_url: null,
    site_id: null,
    status: 'published',
  });
  assert.equal(result.title, null);
});

test('UTCID04: createPost accepts an omitted title for a text-only post', async () => {
  const { PostService, state } = loadPostService();

  stubGetPostById(PostService, async (postId) => ({
    id: postId,
    title: undefined,
    content: 'Simple community update.',
    image_urls: [],
    audio_url: null,
    video_url: null,
    site_id: null,
    status: 'published',
  }));

  const result = await PostService.createPost('user-id', {
    content: 'Simple community update.',
  });

  assert.equal(state.postCreateCalls[0].data.title, undefined);
  assert.equal(result.content, 'Simple community update.');
});

test('UTCID05: createPost throws when user tags a site without a matching check-in', async () => {
  const { PostService, state } = loadPostService();

  await assert.rejects(
    PostService.createPost('user-id', {
      title: 'Tagged post',
      content: 'Trying to tag a site.',
      site_id: 'site-2',
    }),
    (error) => {
      assert.equal(error.message, 'You must check-in at this site before tagging it in your post.');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.postCreateCalls.length, 0);
});

test('UTCID06: createPost propagates detail-loading failure after post creation', async () => {
  const { PostService, state } = loadPostService();

  stubGetPostById(PostService, async () => {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  });

  await assert.rejects(
    PostService.createPost('user-id', {
      title: 'After create',
      content: 'Post created but detail reload fails.',
    }),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.postCreateCalls.length, 1);
});
