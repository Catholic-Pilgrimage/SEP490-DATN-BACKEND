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

test('UTCID01: getPostById returns an active post with liked metadata', async () => {
  const post = createPostInstance({
    id: 'post-1',
    title: 'Community blessing',
    content: 'A meaningful sharing.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService, state } = loadPostService({
    postFindOne: async () => post,
    postLikeFindOne: async () => ({ id: 'like-1' }),
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPostById('post-1', 'user-id');

  assert.equal(state.postFindOneCalls.length, 1);
  assert.deepEqual(state.postFindOneCalls[0].where, {
    id: 'post-1',
    is_active: true,
  });
  assert.deepEqual(result, {
    id: 'post-1',
    title: 'Community blessing',
    content: 'A meaningful sharing.',
    status: 'published',
    is_active: true,
    is_liked: true,
  });
});

test('UTCID02: getPostById returns an active post with is_liked false when user has not liked it', async () => {
  const post = createPostInstance({
    id: 'post-2',
    title: 'Pilgrimage memory',
    content: 'Shared memory from the trip.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService } = loadPostService({
    postFindOne: async () => post,
    postLikeFindOne: async () => null,
  });

  stubFormatPostResponse(PostService);

  const result = await PostService.getPostById('post-2', 'user-id');

  assert.deepEqual(result, {
    id: 'post-2',
    title: 'Pilgrimage memory',
    content: 'Shared memory from the trip.',
    status: 'published',
    is_active: true,
    is_liked: false,
  });
});

test('UTCID03: getPostById throws when the post does not exist', async () => {
  const { PostService } = loadPostService({
    postFindOne: async () => null,
  });

  await assert.rejects(
    PostService.getPostById('missing-post-id', 'user-id'),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );
});

test('UTCID04: getPostById treats an inactive post as not found', async () => {
  const { PostService, state } = loadPostService({
    postFindOne: async () => null,
  });

  await assert.rejects(
    PostService.getPostById('inactive-post-id', 'user-id'),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.deepEqual(state.postFindOneCalls[0].where, {
    id: 'inactive-post-id',
    is_active: true,
  });
});

test('UTCID05: getPostById propagates database errors while checking like status', async () => {
  const post = createPostInstance({
    id: 'post-5',
    title: 'Unexpected error',
    content: 'Like lookup fails.',
    status: 'published',
    is_active: true,
  }, {
    postUpdateCalls: [],
    postReloadCalls: [],
  });

  const { PostService } = loadPostService({
    postFindOne: async () => post,
    postLikeFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  stubFormatPostResponse(PostService);

  await assert.rejects(
    PostService.getPostById('post-5', 'user-id'),
    { message: 'Database unavailable' }
  );
});
