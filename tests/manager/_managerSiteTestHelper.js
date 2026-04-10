const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'manager', 'siteService.js'),
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

function loadManagerSiteService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    userUpdateCalls: [],
    siteFindByPkCalls: [],
    siteFindOneCalls: [],
    siteCreateCalls: [],
    verificationRequestFindOneCalls: [],
    notificationCalls: [],
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
      update: async (values, options) => {
        state.userUpdateCalls.push({ values, options });
        if (overrides.userUpdate) {
          return overrides.userUpdate(values, options, state);
        }
        return [1];
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
      findOne: async (options) => {
        state.siteFindOneCalls.push(options);
        if (overrides.siteFindOne) {
          return overrides.siteFindOne(options, state);
        }
        return null;
      },
      create: async (data) => {
        state.siteCreateCalls.push(data);
        if (overrides.siteCreate) {
          return overrides.siteCreate(data, state);
        }
        return {
          id: 'site-id',
          code: data.code,
          name: data.name,
          description: data.description || null,
          history: data.history || null,
          address: data.address || null,
          province: data.province,
          district: data.district || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          region: data.region,
          type: data.type,
          patron_saint: data.patron_saint || null,
          cover_image: data.cover_image || null,
          opening_hours: data.opening_hours || null,
          contact_info: data.contact_info || null,
          is_active: data.is_active,
          created_by: data.created_by,
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          updated_at: new Date('2026-03-26T00:00:00.000Z'),
        };
      },
    },
    VerificationRequest: {
      findOne: async (options) => {
        state.verificationRequestFindOneCalls.push(options);
        if (overrides.verificationRequestFindOne) {
          return overrides.verificationRequestFindOne(options, state);
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
    notifyFavoriteSiteUsers: async (...args) => {
      state.notificationCalls.push(args);
      if (overrides.notifyFavoriteSiteUsers) {
        return overrides.notifyFavoriteSiteUsers(args, state);
      }
      return undefined;
    },
  });

  const ManagerSiteService = require(MODULES.TARGET);
  return { ManagerSiteService, state };
}

module.exports = {
  loadManagerSiteService,
};
