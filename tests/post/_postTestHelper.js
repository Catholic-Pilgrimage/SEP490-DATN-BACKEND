const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'postService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  PLANNER_SERVICE: path.join(ROOT, 'services', 'plannerService.js'),
};

function setMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearModules() {
  Object.values(MODULES).forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

function createPostInstance(data, state, overrides = {}) {
  const record = {
    is_active: true,
    likes_count: 0,
    created_at: new Date('2026-04-09T00:00:00.000Z'),
    updated_at: new Date('2026-04-09T00:00:00.000Z'),
    ...data,
    toJSON: () => ({
      ...record,
    }),
    update: async (values, options) => {
      state.postUpdateCalls.push({ id: record.id, values, options });
      Object.assign(record, values);
      if (overrides.postInstanceUpdate) {
        return overrides.postInstanceUpdate(record, values, options, state);
      }
      return record;
    },
    reload: async () => {
      state.postReloadCalls.push(record.id);
      return record;
    },
  };

  return record;
}

function createCommentInstance(data, state) {
  const record = {
    status: 'published',
    created_at: new Date('2026-04-09T00:00:00.000Z'),
    updated_at: new Date('2026-04-09T00:00:00.000Z'),
    ...data,
    update: async (values) => {
      state.commentUpdateCalls.push({ id: record.id, values });
      Object.assign(record, values);
      return record;
    },
  };

  return record;
}

function loadPostService(overrides = {}) {
  clearModules();

  const state = {
    postCreateCalls: [],
    postFindByPkCalls: [],
    postFindOneCalls: [],
    postFindAndCountAllCalls: [],
    postUpdateCalls: [],
    postReloadCalls: [],
    postLikeFindOneCalls: [],
    postCommentCountCalls: [],
    postCommentCreateCalls: [],
    postCommentFindByPkCalls: [],
    postCommentFindOneCalls: [],
    postCommentFindAndCountAllCalls: [],
    userCheckinFindOneCalls: [],
  };

  setMock(MODULES.MODELS, {
    Post: {
      create: async (data, options) => {
        state.postCreateCalls.push({ data, options });
        if (overrides.postCreate) {
          return overrides.postCreate(data, options, state);
        }
        return createPostInstance(
          {
            id: 'post-id',
            ...data,
          },
          state,
          overrides
        );
      },
      findByPk: async (postId, options) => {
        state.postFindByPkCalls.push({ postId, options });
        if (overrides.postFindByPk) {
          return overrides.postFindByPk(postId, options, state);
        }
        return null;
      },
      findOne: async (options) => {
        state.postFindOneCalls.push(options);
        if (overrides.postFindOne) {
          return overrides.postFindOne(options, state);
        }
        return null;
      },
      findAndCountAll: async (options) => {
        state.postFindAndCountAllCalls.push(options);
        if (overrides.postFindAndCountAll) {
          return overrides.postFindAndCountAll(options, state);
        }
        return { rows: [], count: 0 };
      },
    },
    PostLike: {
      findOne: async (options) => {
        state.postLikeFindOneCalls.push(options);
        if (overrides.postLikeFindOne) {
          return overrides.postLikeFindOne(options, state);
        }
        return null;
      },
    },
    PostComment: {
      count: async (options) => {
        state.postCommentCountCalls.push(options);
        if (overrides.postCommentCount) {
          return overrides.postCommentCount(options, state);
        }
        return 0;
      },
      create: async (data, options) => {
        state.postCommentCreateCalls.push({ data, options });
        if (overrides.postCommentCreate) {
          return overrides.postCommentCreate(data, options, state);
        }
        return {
          id: 'comment-id',
          ...data,
        };
      },
      findByPk: async (commentId, options) => {
        state.postCommentFindByPkCalls.push({ commentId, options });
        if (overrides.postCommentFindByPk) {
          return overrides.postCommentFindByPk(commentId, options, state);
        }
        return null;
      },
      findOne: async (options) => {
        state.postCommentFindOneCalls.push(options);
        if (overrides.postCommentFindOne) {
          return overrides.postCommentFindOne(options, state);
        }
        return null;
      },
      findAndCountAll: async (options) => {
        state.postCommentFindAndCountAllCalls.push(options);
        if (overrides.postCommentFindAndCountAll) {
          return overrides.postCommentFindAndCountAll(options, state);
        }
        return { rows: [], count: 0 };
      },
    },
    User: {},
    Journal: {},
    Site: {},
    Planner: {},
    PlannerItem: {},
    Report: {
      update: async (values, options) => {
        return [0];
      },
    },
    UserCheckin: {
      findOne: async (options) => {
        state.userCheckinFindOneCalls.push(options);
        if (overrides.userCheckinFindOne) {
          return overrides.userCheckinFindOne(options, state);
        }
        return null;
      },
    },
    sequelize: {},
  });

  setMock(MODULES.PLANNER_SERVICE, {
    formatPlannerItemResponse: (item) => item,
    getPlannerCurrentStatus: (planner) => planner?.status || 'planning',
  });

  const PostService = require(MODULES.TARGET);

  return {
    PostService,
    state,
    createPostInstance: (data) => createPostInstance(data, state, overrides),
  };
}

module.exports = {
  loadPostService,
  createPostInstance,
  createCommentInstance,
};
