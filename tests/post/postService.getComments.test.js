const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPostService, createPostInstance } = require('./_postTestHelper');

function createCommentRecord(data) {
  return {
    id: 'comment-id',
    status: 'published',
    created_at: new Date('2026-04-09T00:00:00.000Z'),
    updated_at: new Date('2026-04-09T00:00:00.000Z'),
    ...data,
  };
}

test('UTCID01: getComments returns published comments with author info and pagination', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-1',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createCommentRecord({
          id: 'comment-1',
          post_id: 'post-1',
          user_id: 'user-a',
          parent_id: null,
          content: 'First comment',
          author: {
            id: 'user-a',
            full_name: 'User A',
            avatar_url: null,
            role: 'pilgrim',
          },
        }),
        createCommentRecord({
          id: 'comment-2',
          post_id: 'post-1',
          user_id: 'user-b',
          parent_id: 'comment-1',
          content: 'Reply comment',
          author: {
            id: 'user-b',
            full_name: 'User B',
            avatar_url: null,
            role: 'pilgrim',
          },
        }),
      ],
    }),
  });

  const result = await PostService.getComments('post-1', 'user-id', {
    page: 1,
    limit: 10,
  });

  assert.equal(state.postCommentFindAndCountAllCalls.length, 1);
  assert.deepEqual(state.postCommentFindAndCountAllCalls[0].where, {
    post_id: 'post-1',
    status: 'published',
  });
  assert.equal(state.postCommentFindAndCountAllCalls[0].order[0][0], 'created_at');
  assert.equal(state.postCommentFindAndCountAllCalls[0].order[0][1], 'ASC');
  assert.equal(result.comments.length, 2);
  assert.equal(result.comments[0].content, 'First comment');
  assert.equal(result.comments[1].parent_id, 'comment-1');
  assert.deepEqual(result.pagination, {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
});

test('UTCID02: getComments applies second-page pagination correctly', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-2',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createCommentRecord({
          id: 'comment-2',
          post_id: 'post-2',
          user_id: 'user-b',
          parent_id: null,
          content: 'Second page comment',
        }),
      ],
    }),
  });

  const result = await PostService.getComments('post-2', 'user-id', {
    page: 2,
    limit: 1,
  });

  assert.equal(state.postCommentFindAndCountAllCalls[0].offset, 1);
  assert.equal(state.postCommentFindAndCountAllCalls[0].limit, 1);
  assert.equal(result.comments[0].id, 'comment-2');
  assert.deepEqual(result.pagination, {
    total: 2,
    page: 2,
    limit: 1,
    totalPages: 2,
  });
});

test('UTCID03: getComments throws when target post does not exist', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => null,
  });

  await assert.rejects(
    PostService.getComments('missing-post-id', 'user-id', {
      page: 1,
      limit: 10,
    }),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.postCommentFindAndCountAllCalls.length, 0);
});

test('UTCID04: getComments returns an empty list when the post has no published comments', async () => {
  const { PostService } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-4',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await PostService.getComments('post-4', 'user-id', {
    page: 1,
    limit: 10,
  });

  assert.deepEqual(result, {
    comments: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  });
});

test('UTCID05: getComments propagates database errors while loading comments', async () => {
  const { PostService } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-5',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PostService.getComments('post-5', 'user-id', {
      page: 1,
      limit: 10,
    }),
    { message: 'Database unavailable' }
  );
});
