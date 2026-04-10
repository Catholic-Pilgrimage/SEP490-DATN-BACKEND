const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPostService, createCommentInstance } = require('./_postTestHelper');

test('UTCID01: deleteComment allows the comment owner to soft delete a published comment', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => {
      state.commentUpdateCalls = state.commentUpdateCalls || [];
      return createCommentInstance({
        id: 'comment-1',
        post_id: 'post-1',
        user_id: 'user-id',
        status: 'published',
      }, state);
    },
    postFindByPk: async () => ({
      id: 'post-1',
      user_id: 'post-owner-id',
    }),
  });

  const result = await PostService.deleteComment('post-1', 'comment-1', 'user-id', 'pilgrim');

  assert.deepEqual(state.commentUpdateCalls[0], {
    id: 'comment-1',
    values: { status: 'rejected' },
  });
  assert.deepEqual(result, { message: 'Comment deleted successfully' });
});

test('UTCID02: deleteComment allows the post owner to delete another user comment', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => {
      state.commentUpdateCalls = state.commentUpdateCalls || [];
      return createCommentInstance({
        id: 'comment-2',
        post_id: 'post-2',
        user_id: 'comment-owner-id',
        status: 'published',
      }, state);
    },
    postFindByPk: async () => ({
      id: 'post-2',
      user_id: 'post-owner-id',
    }),
  });

  const result = await PostService.deleteComment('post-2', 'comment-2', 'post-owner-id', 'pilgrim');

  assert.deepEqual(state.commentUpdateCalls[0], {
    id: 'comment-2',
    values: { status: 'rejected' },
  });
  assert.deepEqual(result, { message: 'Comment deleted successfully' });
});

test('UTCID03: deleteComment allows admin to delete another user comment', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => createCommentInstance({
      id: 'comment-3',
      post_id: 'post-3',
      user_id: 'comment-owner-id',
      status: 'published',
    }, state),
    postFindByPk: async () => ({
      id: 'post-3',
      user_id: 'post-owner-id',
    }),
  });
  state.commentUpdateCalls = [];

  const result = await PostService.deleteComment('post-3', 'comment-3', 'admin-id', 'admin');

  assert.deepEqual(state.commentUpdateCalls[0], {
    id: 'comment-3',
    values: { status: 'rejected' },
  });
  assert.deepEqual(result, { message: 'Comment deleted successfully' });
});

test('UTCID04: deleteComment throws when the target comment does not exist', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => null,
  });

  await assert.rejects(
    PostService.deleteComment('post-4', 'missing-comment', 'user-id', 'pilgrim'),
    (error) => {
      assert.equal(error.message, 'Comment not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.postFindByPkCalls.length, 0);
});

test('UTCID05: deleteComment throws when requester is neither comment owner, post owner, nor admin', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-5',
      post_id: 'post-5',
      user_id: 'comment-owner-id',
      status: 'published',
      update: async () => ({ status: 'rejected' }),
    }),
    postFindByPk: async () => ({
      id: 'post-5',
      user_id: 'post-owner-id',
    }),
  });

  await assert.rejects(
    PostService.deleteComment('post-5', 'comment-5', 'outsider-id', 'pilgrim'),
    (error) => {
      assert.equal(error.message, 'You do not have permission to delete this comment');
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test('UTCID06: deleteComment propagates database errors while updating comment status', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-6',
      post_id: 'post-6',
      user_id: 'user-id',
      status: 'published',
      update: async () => {
        throw new Error('Database unavailable');
      },
    }),
    postFindByPk: async () => ({
      id: 'post-6',
      user_id: 'post-owner-id',
    }),
  });

  await assert.rejects(
    PostService.deleteComment('post-6', 'comment-6', 'user-id', 'pilgrim'),
    { message: 'Database unavailable' }
  );
});

test('UTCID07: deleteComment returns forbidden instead of crashing when parent post cannot be loaded', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-7',
      post_id: 'post-7',
      user_id: 'comment-owner-id',
      status: 'published',
      update: async () => ({ status: 'rejected' }),
    }),
    postFindByPk: async () => null,
  });

  await assert.rejects(
    PostService.deleteComment('post-7', 'comment-7', 'outsider-id', 'pilgrim'),
    (error) => {
      assert.equal(error.message, 'You do not have permission to delete this comment');
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});
