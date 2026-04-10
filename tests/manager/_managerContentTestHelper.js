const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'manager', 'contentService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
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

function createEventInstance(data, state, overrides = {}) {
  const record = {
    ...data,
    update: async (values, options) => {
      state.eventInstanceUpdateCalls.push({ id: data.id, values, options });
      Object.assign(record, values);
      if (overrides.eventInstanceUpdate) {
        return overrides.eventInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };
  return record;
}

function loadManagerContentService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    eventCountCalls: [],
    eventFindAllCalls: [],
    eventFindOneCalls: [],
    eventInstanceUpdateCalls: [],
    siteFindByPkCalls: [],
    createNotificationCalls: [],
    favoriteNotificationCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    Site: {
      findByPk: async (siteId, options) => {
        state.siteFindByPkCalls.push({ siteId, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(siteId, options, state);
        }
        return null;
      },
    },
    SiteMedia: {},
    MassSchedule: {},
    GuideShift: {},
    NearbyPlace: {},
    Event: {
      count: async (options) => {
        state.eventCountCalls.push(options);
        if (overrides.eventCount) {
          return overrides.eventCount(options, state);
        }
        return 0;
      },
      findAll: async (options) => {
        state.eventFindAllCalls.push(options);
        if (overrides.eventFindAll) {
          return overrides.eventFindAll(options, state);
        }
        return [];
      },
      findOne: async (options) => {
        state.eventFindOneCalls.push(options);
        if (overrides.eventFindOne) {
          return overrides.eventFindOne(options, state);
        }
        return null;
      },
    },
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION, {
    createNotification: async (...args) => {
      state.createNotificationCalls.push(args);
      if (overrides.createNotification) {
        return overrides.createNotification(args, state);
      }
      return undefined;
    },
    notifyFavoriteSiteUsers: async (...args) => {
      state.favoriteNotificationCalls.push(args);
      if (overrides.notifyFavoriteSiteUsers) {
        return overrides.notifyFavoriteSiteUsers(args, state);
      }
      return undefined;
    },
  });

  const ManagerContentService = require(MODULES.TARGET);
  return {
    ManagerContentService,
    state,
    createEventInstance: (data) => createEventInstance(data, state, overrides),
  };
}

module.exports = {
  loadManagerContentService,
};
