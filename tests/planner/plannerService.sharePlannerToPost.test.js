const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRecord(data) {
  return {
    id: 'planner-id',
    is_active: true,
    status: 'completed',
    name: 'Faith Journey',
    user_id: 'owner-id',
    ...data,
  };
}

test('UTCID01: sharePlannerToPost shares a completed owned planner with trimmed custom content', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(),
    postFindOne: async () => null,
    postCreate: async (data) => ({
      id: 'post-1',
      ...data,
    }),
    postFindByPk: async () => ({
      id: 'post-1',
      planner_id: 'planner-id',
      content: 'Journey summary',
      status: 'published',
    }),
    postServiceFormatPostResponse: async (post) => ({
      id: post.id,
      planner_id: post.planner_id,
      status: post.status,
      formatted: true,
    }),
  });

  const result = await PlannerService.sharePlannerToPost('owner-id', 'planner-id', {
    content: '  Journey summary  ',
  });

  assert.equal(state.postCreateCalls.length, 1);
  assert.deepEqual(state.postCreateCalls[0].data, {
    user_id: 'owner-id',
    planner_id: 'planner-id',
    content: 'Journey summary',
    status: 'published',
  });
  assert.equal(state.postFindByPkCalls[0].postId, 'post-1');
  assert.equal(state.infoLogs[0][0], 'Planner planner-id shared to post post-1 by user owner-id');
  assert.deepEqual(result, {
    id: 'post-1',
    planner_id: 'planner-id',
    status: 'published',
    formatted: true,
  });
});

test('UTCID02: sharePlannerToPost uses default content and returns raw post when detail lookup is unavailable', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord({
      id: 'planner-2',
      name: 'La Vang Pilgrimage',
    }),
    postFindOne: async () => null,
    postCreate: async (data) => ({
      id: 'post-2',
      ...data,
    }),
    postFindByPk: async () => null,
  });

  const result = await PlannerService.sharePlannerToPost('owner-id', 'planner-2', {});

  assert.equal(state.postCreateCalls.length, 1);
  assert.equal(state.postCreateCalls[0].data.user_id, 'owner-id');
  assert.equal(state.postCreateCalls[0].data.planner_id, 'planner-2');
  assert.equal(state.postCreateCalls[0].data.status, 'published');
  assert.equal(typeof state.postCreateCalls[0].data.content, 'string');
  assert.ok(state.postCreateCalls[0].data.content.includes('La Vang Pilgrimage'));
  assert.deepEqual(result, {
    id: 'post-2',
    user_id: 'owner-id',
    planner_id: 'planner-2',
    content: state.postCreateCalls[0].data.content,
    status: 'published',
  });
});

test('UTCID03: sharePlannerToPost throws when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.sharePlannerToPost('owner-id', 'missing-planner-id', {}),
    { message: 'Planner not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Share planner to post error:');
});

test('UTCID04: sharePlannerToPost throws forbidden when requester is not the planner owner', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord({
      user_id: 'other-owner-id',
    }),
  });

  await assert.rejects(
    PlannerService.sharePlannerToPost('owner-id', 'planner-id', {}),
    (error) => {
      assert.equal(error.message, 'You can only share your own planners');
      assert.equal(error.statusCode, 403);
      return true;
    }
  );

  assert.equal(state.errorLogs[0][0], 'Share planner to post error:');
});

test('UTCID05: sharePlannerToPost throws when planner is not completed', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord({
      status: 'ongoing',
    }),
  });

  await assert.rejects(
    PlannerService.sharePlannerToPost('owner-id', 'planner-id', {}),
    (error) => {
      assert.equal(error.message, 'You can only share a completed journey');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.errorLogs[0][0], 'Share planner to post error:');
});

test('UTCID06: sharePlannerToPost throws when planner has already been shared', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(),
    postFindOne: async () => ({
      id: 'existing-post-id',
      planner_id: 'planner-id',
    }),
  });

  await assert.rejects(
    PlannerService.sharePlannerToPost('owner-id', 'planner-id', {}),
    (error) => {
      assert.equal(error.message, 'This journey has already been shared to the community');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.errorLogs[0][0], 'Share planner to post error:');
});

test('UTCID07: sharePlannerToPost maps Sequelize unique constraint errors to duplicate-share error', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(),
    postFindOne: async () => null,
    postCreate: async () => {
      const error = new Error('duplicate');
      error.name = 'SequelizeUniqueConstraintError';
      throw error;
    },
  });

  await assert.rejects(
    PlannerService.sharePlannerToPost('owner-id', 'planner-id', {}),
    (error) => {
      assert.equal(error.message, 'This journey has already been shared to the community');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.errorLogs.length, 0);
});
