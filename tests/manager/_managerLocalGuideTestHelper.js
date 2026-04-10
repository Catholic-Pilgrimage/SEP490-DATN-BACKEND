const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'manager', 'localGuideService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  EMAIL: path.join(ROOT, 'services', 'shared', 'emailService.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  DATABASE: path.join(ROOT, 'config', 'database.js'),
  BCRYPT: require.resolve('bcryptjs'),
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

function loadManagerLocalGuideService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    userFindOneCalls: [],
    userCreateCalls: [],
    userCountCalls: [],
    userFindAllCalls: [],
    bcryptHashCalls: [],
    emailCredentialCalls: [],
    notificationCreateCalls: [],
    guideShiftSubmissionUpdateCalls: [],
    eventUpdateCalls: [],
    siteMediaUpdateCalls: [],
    massScheduleUpdateCalls: [],
    nearbyPlaceUpdateCalls: [],
    transactionCommitCalls: 0,
    transactionRollbackCalls: 0,
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
      findOne: async (options) => {
        state.userFindOneCalls.push(options);
        if (overrides.userFindOne) {
          return overrides.userFindOne(options, state);
        }
        return null;
      },
      create: async (data) => {
        state.userCreateCalls.push(data);
        if (overrides.userCreate) {
          return overrides.userCreate(data, state);
        }
        return {
          id: 'local-guide-id',
          email: data.email,
          full_name: data.full_name,
          phone: data.phone,
          role: data.role,
          status: data.status,
          created_at: new Date('2026-03-26T00:00:00.000Z'),
        };
      },
      count: async (options) => {
        state.userCountCalls.push(options);
        if (overrides.userCount) {
          return overrides.userCount(options, state);
        }
        return 0;
      },
      findAll: async (options) => {
        state.userFindAllCalls.push(options);
        if (overrides.userFindAll) {
          return overrides.userFindAll(options, state);
        }
        return [];
      },
    },
    Site: {},
    GuideShift: {},
    GuideShiftSubmission: {
      update: async (values, options) => {
        state.guideShiftSubmissionUpdateCalls.push({ values, options });
        if (overrides.guideShiftSubmissionUpdate) {
          return overrides.guideShiftSubmissionUpdate(values, options, state);
        }
        return [1];
      },
    },
    Event: {
      update: async (values, options) => {
        state.eventUpdateCalls.push({ values, options });
        if (overrides.eventUpdate) {
          return overrides.eventUpdate(values, options, state);
        }
        return [1];
      },
    },
    SiteMedia: {
      update: async (values, options) => {
        state.siteMediaUpdateCalls.push({ values, options });
        if (overrides.siteMediaUpdate) {
          return overrides.siteMediaUpdate(values, options, state);
        }
        return [1];
      },
    },
    MassSchedule: {
      update: async (values, options) => {
        state.massScheduleUpdateCalls.push({ values, options });
        if (overrides.massScheduleUpdate) {
          return overrides.massScheduleUpdate(values, options, state);
        }
        return [1];
      },
    },
    NearbyPlace: {
      update: async (values, options) => {
        state.nearbyPlaceUpdateCalls.push({ values, options });
        if (overrides.nearbyPlaceUpdate) {
          return overrides.nearbyPlaceUpdate(values, options, state);
        }
        return [1];
      },
    },
  });

  setMock(MODULES.BCRYPT, {
    hash: async (plainText, saltRounds) => {
      state.bcryptHashCalls.push({ plainText, saltRounds });
      if (overrides.bcryptHash) {
        return overrides.bcryptHash(plainText, saltRounds, state);
      }
      return `hashed-${plainText}`;
    },
  });

  setMock(MODULES.EMAIL, {
    sendLocalGuideCredentials: async (...args) => {
      state.emailCredentialCalls.push(args);
      if (overrides.sendLocalGuideCredentials) {
        return overrides.sendLocalGuideCredentials(args, state);
      }
      return undefined;
    },
  });

  setMock(MODULES.NOTIFICATION, {
    createNotification: async (...args) => {
      state.notificationCreateCalls.push(args);
      if (overrides.createNotification) {
        return overrides.createNotification(args, state);
      }
      return undefined;
    },
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.DATABASE, {
    transaction: async () => ({
      commit: async () => {
        state.transactionCommitCalls += 1;
      },
      rollback: async () => {
        state.transactionRollbackCalls += 1;
      },
    }),
  });

  const ManagerLocalGuideService = require(MODULES.TARGET);
  return { ManagerLocalGuideService, state };
}

module.exports = {
  loadManagerLocalGuideService,
};
