const path = require('node:path');

const ROOT = process.cwd();

const MODULES = {
  PILGRIM_TARGET: path.join(ROOT, 'services', 'pilgrim', 'verificationService.js'),
  ADMIN_TARGET: path.join(ROOT, 'services', 'admin', 'verificationService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  EMAIL: path.join(ROOT, 'services', 'shared', 'emailService.js'),
  MANAGER_INDEX: path.join(ROOT, 'services', 'manager', 'index.js'),
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

function createPilgrimModels(state, overrides) {
  return {
    VerificationRequest: {
      findOne: async (query) => {
        state.verificationRequestFindOneCalls.push(query);
        if (overrides.verificationRequestFindOne) {
          return overrides.verificationRequestFindOne(query, state);
        }
        return null;
      },
      create: async (payload) => {
        state.verificationRequestCreateCalls.push(payload);
        if (overrides.verificationRequestCreate) {
          return overrides.verificationRequestCreate(payload, state);
        }
        return {
          id: 'verification-request-id',
          ...payload,
          created_at: new Date('2026-03-26T00:00:00.000Z'),
        };
      },
    },
    User: {
      findOne: async (query) => {
        state.userFindOneCalls.push(query);
        if (overrides.userFindOne) {
          return overrides.userFindOne(query, state);
        }
        return null;
      },
      findByPk: async (id) => {
        state.userFindByPkCalls.push(id);
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(id, state);
        }
        return null;
      },
    },
    Site: {
      findOne: async (query) => {
        state.siteFindOneCalls.push(query);
        if (overrides.siteFindOne) {
          return overrides.siteFindOne(query, state);
        }
        return null;
      },
      findByPk: async (id) => {
        state.siteFindByPkCalls.push(id);
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(id, state);
        }
        return null;
      },
    },
  };
}

function createAdminModels(state, overrides) {
  return {
    VerificationRequest: {
      findAndCountAll: async (query) => {
        state.verificationRequestFindAndCountAllCalls.push(query);
        if (overrides.verificationRequestFindAndCountAll) {
          return overrides.verificationRequestFindAndCountAll(query, state);
        }
        return { rows: [], count: 0 };
      },
      findByPk: async (id, options) => {
        state.verificationRequestFindByPkCalls.push({ id, options });
        if (overrides.verificationRequestFindByPk) {
          return overrides.verificationRequestFindByPk(id, options, state);
        }
        return null;
      },
      create: async (payload) => {
        state.verificationRequestCreateCalls.push(payload);
        if (overrides.verificationRequestCreate) {
          return overrides.verificationRequestCreate(payload, state);
        }
        return payload;
      },
    },
    User: {
      findByPk: async (id, options) => {
        state.userFindByPkCalls.push({ id, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(id, options, state);
        }
        return null;
      },
      findOne: async (query) => {
        state.userFindOneCalls.push(query);
        if (overrides.userFindOne) {
          return overrides.userFindOne(query, state);
        }
        return null;
      },
      findAll: async (query) => {
        state.userFindAllCalls.push(query);
        if (overrides.userFindAll) {
          return overrides.userFindAll(query, state);
        }
        return [];
      },
      update: async (payload, query) => {
        state.userUpdateCalls.push({ payload, query });
        if (overrides.userUpdate) {
          return overrides.userUpdate(payload, query, state);
        }
        return [0];
      },
      create: async (payload, options) => {
        state.userCreateCalls.push({ payload, options });
        if (overrides.userCreate) {
          return overrides.userCreate(payload, options, state);
        }
        return {
          id: 'new-manager-id',
          ...payload,
          update: async (updatePayload) => {
            state.instanceUserUpdateCalls.push(updatePayload);
            return { ...payload, ...updatePayload };
          },
        };
      },
    },
    Site: {
      findByPk: async (id, options) => {
        state.siteFindByPkCalls.push({ id, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(id, options, state);
        }
        return null;
      },
      create: async (payload, options) => {
        state.siteCreateCalls.push({ payload, options });
        if (overrides.siteCreate) {
          return overrides.siteCreate(payload, options, state);
        }
        return {
          id: 'new-site-id',
          ...payload,
        };
      },
    },
  };
}

function loadPilgrimVerificationService(overrides = {}) {
  clearModules();

  const state = {
    verificationRequestFindOneCalls: [],
    verificationRequestCreateCalls: [],
    userFindOneCalls: [],
    userFindByPkCalls: [],
    siteFindOneCalls: [],
    siteFindByPkCalls: [],
    notifyAllAdminsCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, createPilgrimModels(state, overrides));
  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });
  setMock(MODULES.NOTIFICATION, {
    notifyAllAdmins: async (...args) => {
      state.notifyAllAdminsCalls.push(args);
      if (overrides.notifyAllAdmins) {
        return overrides.notifyAllAdmins(args, state);
      }
      return undefined;
    },
  });

  const PilgrimVerificationService = require(MODULES.PILGRIM_TARGET);
  return { PilgrimVerificationService, state };
}

function loadAdminVerificationService(overrides = {}) {
  clearModules();

  const state = {
    verificationRequestFindAndCountAllCalls: [],
    verificationRequestFindByPkCalls: [],
    verificationRequestCreateCalls: [],
    userFindByPkCalls: [],
    userFindOneCalls: [],
    userFindAllCalls: [],
    userUpdateCalls: [],
    userCreateCalls: [],
    instanceUserUpdateCalls: [],
    siteFindByPkCalls: [],
    siteCreateCalls: [],
    managerSiteCodeCalls: [],
    emailCalls: {
      sendManagerReplacedNotification: [],
      sendManagerWelcome: [],
      sendVerificationApprovedWithSite: [],
      sendTransitionApproved: [],
      sendVerificationRejected: [],
    },
    notificationCreateCalls: [],
    bcryptHashCalls: [],
    transactionCommitCalls: 0,
    transactionRollbackCalls: 0,
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, createAdminModels(state, overrides));
  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });
  setMock(MODULES.EMAIL, {
    sendManagerReplacedNotification: async (...args) => {
      state.emailCalls.sendManagerReplacedNotification.push(args);
      if (overrides.sendManagerReplacedNotification) {
        return overrides.sendManagerReplacedNotification(args, state);
      }
      return undefined;
    },
    sendManagerWelcome: async (...args) => {
      state.emailCalls.sendManagerWelcome.push(args);
      if (overrides.sendManagerWelcome) {
        return overrides.sendManagerWelcome(args, state);
      }
      return undefined;
    },
    sendVerificationApprovedWithSite: async (...args) => {
      state.emailCalls.sendVerificationApprovedWithSite.push(args);
      if (overrides.sendVerificationApprovedWithSite) {
        return overrides.sendVerificationApprovedWithSite(args, state);
      }
      return undefined;
    },
    sendTransitionApproved: async (...args) => {
      state.emailCalls.sendTransitionApproved.push(args);
      if (overrides.sendTransitionApproved) {
        return overrides.sendTransitionApproved(args, state);
      }
      return undefined;
    },
    sendVerificationRejected: async (...args) => {
      state.emailCalls.sendVerificationRejected.push(args);
      if (overrides.sendVerificationRejected) {
        return overrides.sendVerificationRejected(args, state);
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
  setMock(MODULES.MANAGER_INDEX, {
    ManagerSiteService: {
      generateSiteCode: async (...args) => {
        state.managerSiteCodeCalls.push(args);
        if (overrides.generateSiteCode) {
          return overrides.generateSiteCode(args, state);
        }
        return 'CHN-001';
      },
    },
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
  setMock(MODULES.BCRYPT, {
    hash: async (plainText, saltRounds) => {
      state.bcryptHashCalls.push({ plainText, saltRounds });
      if (overrides.bcryptHash) {
        return overrides.bcryptHash(plainText, saltRounds, state);
      }
      return `hashed-${plainText}`;
    },
  });

  const AdminVerificationService = require(MODULES.ADMIN_TARGET);
  return { AdminVerificationService, state };
}

module.exports = {
  loadPilgrimVerificationService,
  loadAdminVerificationService,
};
