const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPostService } = require('./_postTestHelper');

test('UTCID01: updateComment updates an owned top-level comment successfully', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-1',
      post_id: 'post-1',
      user_id: 'user-id',
      parent_id: null,
      content: 'Old content',
      update: async (values) => {
        state.commentUpdateCalls.push({ id: 'comment-1', values });
        return values;
      },
    }),
    postCommentFindByPk: async (commentId) => ({
      id: commentId,
      post_id: 'post-1',
      user_id: 'user-id',
      parent_id: null,
      content: 'Updated content',
      author: {
        id: 'user-id',
        full_name: 'Pilgrim User',
        avatar_url: null,
        role: 'pilgrim',
      },
    }),
  });
  state.commentUpdateCalls = [];

  const result = await PostService.updateComment('post-1', 'comment-1', 'user-id', 'Updated content');

  assert.deepEqual(state.postCommentFindOneCalls[0], {
    where: {
      id: 'comment-1',
      post_id: 'post-1',
      status: 'published',
    },
  });
  assert.deepEqual(state.commentUpdateCalls[0], {
    id: 'comment-1',
    values: { content: 'Updated content' },
  });
  assert.equal(result.content, 'Updated content');
  assert.equal(result.parent_id, null);
});

test('UTCID02: updateComment updates an owned reply comment successfully', async () => {
  const { PostService, state } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-2',
      post_id: 'post-2',
      user_id: 'user-id',
      parent_id: 'parent-1',
      content: 'Old reply',
      update: async (values) => {
        state.commentUpdateCalls.push({ id: 'comment-2', values });
        return values;
      },
    }),
    postCommentFindByPk: async (commentId) => ({
      id: commentId,
      post_id: 'post-2',
      user_id: 'user-id',
      parent_id: 'parent-1',
      content: 'Updated reply',
      author: {
        id: 'user-id',
        full_name: 'Pilgrim User',
        avatar_url: null,
        role: 'pilgrim',
      },
    }),
  });
  state.commentUpdateCalls = [];

  const result = await PostService.updateComment('post-2', 'comment-2', 'user-id', 'Updated reply');

  assert.deepEqual(state.commentUpdateCalls[0], {
    id: 'comment-2',
    values: { content: 'Updated reply' },
  });
  assert.equal(result.parent_id, 'parent-1');
  assert.equal(result.content, 'Updated reply');
});

test('UTCID03: updateComment throws when the target comment does not exist', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => null,
  });

  await assert.rejects(
    PostService.updateComment('post-3', 'missing-comment', 'user-id', 'Updated content'),
    (error) => {
      assert.equal(error.message, 'Comment not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );
});

test('UTCID04: updateComment throws when requester is not the comment owner', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-4',
      post_id: 'post-4',
      user_id: 'other-user-id',
      content: 'Original comment',
    }),
  });

  await assert.rejects(
    PostService.updateComment('post-4', 'comment-4', 'user-id', 'Updated content'),
    (error) => {
      assert.equal(error.message, 'You can only update your own comments');
      assert.equal(error.statusCode, 403);
      return true;
    }
  );
});

test('UTCID05: updateComment propagates database errors while saving the comment', async () => {
  const { PostService } = loadPostService({
    postCommentFindOne: async () => ({
      id: 'comment-5',
      post_id: 'post-5',
      user_id: 'user-id',
      content: 'Original comment',
      update: async () => {
        throw new Error('Database unavailable');
      },
    }),
  });

  await assert.rejects(
    PostService.updateComment('post-5', 'comment-5', 'user-id', 'Updated content'),
    { message: 'Database unavailable' }
  );
});
