const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'journalService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
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

function createJournalInstance(data, state, overrides = {}) {
  const record = {
    is_active: true,
    created_at: new Date('2026-04-09T00:00:00.000Z'),
    updated_at: new Date('2026-04-09T00:00:00.000Z'),
    ...data,
    get: ({ plain } = {}) => {
      if (!plain) {
        return record;
      }

      return { ...record };
    },
    update: async (values, options) => {
      state.journalUpdateCalls.push({ id: record.id, values, options });
      Object.assign(record, values);
      if (overrides.journalInstanceUpdate) {
        return overrides.journalInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };

  return record;
}

function createPlannerRecord(data) {
  return {
    id: 'planner-id',
    status: 'completed',
    user_id: 'user-id',
    ...data,
  };
}

function createPlannerItemRecord(data) {
  return {
    id: 'item-id',
    planner_id: 'planner-id',
    site_id: 'site-id',
    planner: createPlannerRecord(),
    site: {
      id: 'site-id',
      name: 'La Vang',
      code: 'S001',
      province: 'Hue',
      cover_image: null,
    },
    ...data,
  };
}

function loadJournalService(overrides = {}) {
  clearModules();

  const state = {
    journalCreateCalls: [],
    journalFindByPkCalls: [],
    journalFindOneCalls: [],
    journalFindAllCalls: [],
    journalFindAndCountAllCalls: [],
    journalUpdateCalls: [],
    postFindOneCalls: [],
    postCreateCalls: [],
    plannerItemFindAllCalls: [],
    plannerFindByPkCalls: [],
    plannerMemberFindOneCalls: [],
    userCheckinFindAllCalls: [],
    siteMediaFindAllCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    Journal: {
      create: async (data, options) => {
        state.journalCreateCalls.push({ data, options });
        if (overrides.journalCreate) {
          return overrides.journalCreate(data, options, state);
        }
        return createJournalInstance(
          {
            id: 'journal-id',
            ...data,
          },
          state,
          overrides
        );
      },
      findByPk: async (journalId, options) => {
        state.journalFindByPkCalls.push({ journalId, options });
        if (overrides.journalFindByPk) {
          return overrides.journalFindByPk(journalId, options, state);
        }
        return null;
      },
      findOne: async (options) => {
        state.journalFindOneCalls.push(options);
        if (overrides.journalFindOne) {
          return overrides.journalFindOne(options, state);
        }
        return null;
      },
      findAll: async (options) => {
        state.journalFindAllCalls.push(options);
        if (overrides.journalFindAll) {
          return overrides.journalFindAll(options, state);
        }
        return [];
      },
      findAndCountAll: async (options) => {
        state.journalFindAndCountAllCalls.push(options);
        if (overrides.journalFindAndCountAll) {
          return overrides.journalFindAndCountAll(options, state);
        }
        return { rows: [], count: 0 };
      },
    },
    User: {
      findByPk: async () => null,
    },
    Post: {
      findOne: async (options) => {
        state.postFindOneCalls.push(options);
        if (overrides.postFindOne) {
          return overrides.postFindOne(options, state);
        }
        return null;
      },
      create: async (data, options) => {
        state.postCreateCalls.push({ data, options });
        if (overrides.postCreate) {
          return overrides.postCreate(data, options, state);
        }
        return {
          id: 'post-id',
          ...data,
        };
      },
    },
    Site: {},
    SiteMedia: {
      findAll: async (options) => {
        state.siteMediaFindAllCalls.push(options);
        if (overrides.siteMediaFindAll) {
          return overrides.siteMediaFindAll(options, state);
        }
        return [];
      },
    },
    UserCheckin: {
      findAll: async (options) => {
        state.userCheckinFindAllCalls.push(options);
        if (overrides.userCheckinFindAll) {
          return overrides.userCheckinFindAll(options, state);
        }
        return [];
      },
    },
    PlannerItem: {
      findAll: async (options) => {
        state.plannerItemFindAllCalls.push(options);
        if (overrides.plannerItemFindAll) {
          return overrides.plannerItemFindAll(options, state);
        }
        return [];
      },
    },
    Planner: {
      findByPk: async (plannerId, options) => {
        state.plannerFindByPkCalls.push({ plannerId, options });
        if (overrides.plannerFindByPk) {
          return overrides.plannerFindByPk(plannerId, options, state);
        }
        return null;
      },
    },
    PlannerMember: {
      findOne: async (options) => {
        state.plannerMemberFindOneCalls.push(options);
        if (overrides.plannerMemberFindOne) {
          return overrides.plannerMemberFindOne(options, state);
        }
        return null;
      },
    },
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => {
      state.infoLogs.push(args);
    },
    error: (...args) => {
      state.errorLogs.push(args);
    },
  });

  const JournalService = require(MODULES.TARGET);

  return {
    JournalService,
    state,
    createJournalInstance: (data) => createJournalInstance(data, state, overrides),
    createPlannerRecord,
    createPlannerItemRecord,
  };
}

module.exports = {
  loadJournalService,
  createJournalInstance,
  createPlannerRecord,
  createPlannerItemRecord,
};
