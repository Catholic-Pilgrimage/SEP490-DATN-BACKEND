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

test('UTCID01: addComment creates a top-level published comment successfully', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-1',
      user_id: 'post-owner-id',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindByPk: async (commentId) => createCommentRecord({
      id: commentId,
      post_id: 'post-1',
      user_id: 'user-id',
      parent_id: null,
      content: 'Blessed sharing.',
      author: {
        id: 'user-id',
        full_name: 'Pilgrim User',
        avatar_url: null,
        role: 'pilgrim',
      },
    }),
  });

  const result = await PostService.addComment('post-1', 'user-id', 'Blessed sharing.');

  assert.deepEqual(state.postCommentCreateCalls[0].data, {
    post_id: 'post-1',
    user_id: 'user-id',
    parent_id: null,
    content: 'Blessed sharing.',
    status: 'published',
  });
  assert.equal(result.parent_id, null);
  assert.equal(result.content, 'Blessed sharing.');
});

test('UTCID02: addComment creates a reply when parent comment exists in the same post', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-2',
      user_id: 'post-owner-id',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindOne: async () => createCommentRecord({
      id: 'parent-1',
      post_id: 'post-2',
      status: 'published',
    }),
    postCommentFindByPk: async (commentId) => createCommentRecord({
      id: commentId,
      post_id: 'post-2',
      user_id: 'user-id',
      parent_id: 'parent-1',
      content: 'Amen to this.',
      author: {
        id: 'user-id',
        full_name: 'Pilgrim User',
        avatar_url: null,
        role: 'pilgrim',
      },
    }),
  });

  const result = await PostService.addComment('post-2', 'user-id', 'Amen to this.', 'parent-1');

  assert.equal(state.postCommentFindOneCalls.length, 1);
  assert.deepEqual(state.postCommentFindOneCalls[0], {
    where: {
      id: 'parent-1',
      post_id: 'post-2',
      status: 'published',
    },
  });
  assert.equal(state.postCommentCreateCalls[0].data.parent_id, 'parent-1');
  assert.equal(result.parent_id, 'parent-1');
});

test('UTCID03: addComment throws when target post does not exist', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => null,
  });

  await assert.rejects(
    PostService.addComment('missing-post-id', 'user-id', 'Content'),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.postCommentCreateCalls.length, 0);
});

test('UTCID04: addComment throws when reply parent comment is not found in the target post', async () => {
  const { PostService, state } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-4',
      user_id: 'post-owner-id',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindOne: async () => null,
  });

  await assert.rejects(
    PostService.addComment('post-4', 'user-id', 'Reply content', 'missing-parent'),
    (error) => {
      assert.equal(error.message, 'Parent comment not found in this post');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.postCommentCreateCalls.length, 0);
});

test('UTCID05: addComment throws when reply parent comment exists but belongs to another post or is not published', async () => {
  const { PostService } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-5',
      user_id: 'post-owner-id',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentFindOne: async () => null,
  });

  await assert.rejects(
    PostService.addComment('post-5', 'user-id', 'Nested reply', 'parent-from-other-post'),
    (error) => {
      assert.equal(error.message, 'Parent comment not found in this post');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );
});

test('UTCID06: addComment propagates database errors while creating the comment', async () => {
  const { PostService } = loadPostService({
    postFindByPk: async () => createPostInstance({
      id: 'post-6',
      user_id: 'post-owner-id',
      status: 'published',
      is_active: true,
    }, { postUpdateCalls: [], postReloadCalls: [] }),
    postCommentCreate: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    PostService.addComment('post-6', 'user-id', 'Create failure'),
    { message: 'Database unavailable' }
  );
});
