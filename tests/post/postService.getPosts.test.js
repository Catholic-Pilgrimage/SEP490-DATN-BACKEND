const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPostService, createPostInstance } = require('./_postTestHelper');

function stubFormatPostResponse(PostService) {
  PostService.formatPostResponse = async (post, extraFields = {}) => ({
    id: post.id,
    title: post.title || null,
    content: post.content,
    status: post.status,
    is_active: post.is_active,
    ...extraFields,
  });
}

test('UTCID01: getPosts returns published active community posts with like and comment metadata', async () => {
  const post = createPostInstance({
    id: 'post-1',
    title: 'Shared blessing',
    content: 'A peaceful journey.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService, state } = loadPostService({
    postFindAndCountAll: async () => ({
      count: 1,
      rows: [post],
    }),
    postLikeFindOne: async () => ({ id: 'like-1' }),
    postCommentCount: async () => 3,
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPosts('user-id', {
    page: 1,
    limit: 10,
  });

  assert.equal(state.postFindAndCountAllCalls.length, 1);
  assert.deepEqual(state.postFindAndCountAllCalls[0].where, {
    status: 'published',
    is_active: true,
  });
  assert.equal(result.posts.length, 1);
  assert.deepEqual(result.posts[0], {
    id: 'post-1',
    title: 'Shared blessing',
    content: 'A peaceful journey.',
    status: 'published',
    is_active: true,
    is_liked: true,
    comments_count: 3,
  });
  assert.deepEqual(result.pagination, {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
});

test('UTCID02: getPosts applies second-page pagination correctly', async () => {
  const post = createPostInstance({
    id: 'post-2',
    title: 'Page two post',
    content: 'Returned on second page.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService, state } = loadPostService({
    postFindAndCountAll: async () => ({
      count: 2,
      rows: [post],
    }),
    postLikeFindOne: async () => null,
    postCommentCount: async () => 0,
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPosts('user-id', {
    page: 2,
    limit: 1,
  });

  assert.equal(state.postFindAndCountAllCalls[0].offset, 1);
  assert.equal(state.postFindAndCountAllCalls[0].limit, 1);
  assert.deepEqual(result.posts[0], {
    id: 'post-2',
    title: 'Page two post',
    content: 'Returned on second page.',
    status: 'published',
    is_active: true,
    is_liked: false,
    comments_count: 0,
  });
  assert.deepEqual(result.pagination, {
    total: 2,
    page: 2,
    limit: 1,
    totalPages: 2,
  });
});

test('UTCID03: getPosts returns multiple posts in returned order with per-post metadata', async () => {
  const firstPost = createPostInstance({
    id: 'post-3',
    title: 'Newest post',
    content: 'First in order.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });
  const secondPost = createPostInstance({
    id: 'post-4',
    title: 'Older post',
    content: 'Second in order.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService } = loadPostService({
    postFindAndCountAll: async () => ({
      count: 2,
      rows: [firstPost, secondPost],
    }),
    postLikeFindOne: async (options) => (options.where.post_id === 'post-3' ? { id: 'like-3' } : null),
    postCommentCount: async (options) => (options.where.post_id === 'post-3' ? 2 : 1),
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPosts('user-id', {
    page: 1,
    limit: 10,
  });

  assert.deepEqual(result.posts, [
    {
      id: 'post-3',
      title: 'Newest post',
      content: 'First in order.',
      status: 'published',
      is_active: true,
      is_liked: true,
      comments_count: 2,
    },
    {
      id: 'post-4',
      title: 'Older post',
      content: 'Second in order.',
      status: 'published',
      is_active: true,
      is_liked: false,
      comments_count: 1,
    },
  ]);
});

test('UTCID04: getPosts returns an empty list when no published posts exist', async () => {
  const { PostService } = loadPostService({
    postFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPosts('user-id', {
    page: 1,
    limit: 10,
  });

  assert.deepEqual(result, {
    posts: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  });
});

test('UTCID05: getPosts propagates database errors while loading posts', async () => {
  const { PostService } = loadPostService({
    postFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PostService.getPosts('user-id', {
      page: 1,
      limit: 10,
    }),
    { message: 'Database unavailable' }
  );
});
