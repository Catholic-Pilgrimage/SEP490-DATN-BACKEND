const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'manager', 'sosService.js'),
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

function createUserRecord(data) {
  return {
    id: 'manager-id',
    role: 'manager',
    status: 'active',
    site_id: 'site-1',
    full_name: 'Manager User',
    phone: '0900000000',
    ...data,
  };
}

function createSiteRecord(data) {
  return {
    id: 'site-1',
    name: 'La Vang Shrine',
    address: 'Hue',
    province: 'Hue',
    ...data,
  };
}

function createSOSRecord(data) {
  return {
    id: 'sos-id',
    code: 'SOS0411001',
    user_id: 'pilgrim-id',
    site_id: 'site-1',
    status: 'pending',
    assigned_to: null,
    assigned_at: null,
    message: 'Need urgent help',
    pilgrim: null,
    assignedGuide: null,
    site: null,
    ...data,
  };
}

function loadManagerSOSService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    sosFindOneCalls: [],
    sosFindByPkCalls: [],
    sosUpdateCalls: [],
    createNotificationCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    SOSRequest: {
      findOne: async (options) => {
        state.sosFindOneCalls.push(options);
        if (overrides.sosFindOne) {
          return overrides.sosFindOne(options, state);
        }
        return null;
      },
      findByPk: async (sosId, options) => {
        state.sosFindByPkCalls.push({ sosId, options });
        if (overrides.sosFindByPk) {
          return overrides.sosFindByPk(sosId, options, state);
        }
        return null;
      },
      update: async (values, options) => {
        state.sosUpdateCalls.push({ values, options });
        if (overrides.sosUpdate) {
          return overrides.sosUpdate(values, options, state);
        }
        return [1];
      },
    },
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    Site: {},
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION, {
    createNotification: async (...args) => {
      state.createNotificationCalls.push(args);
      if (overrides.createNotification) {
        return overrides.createNotification(...args, state);
      }
      return { id: 'notification-id' };
    },
  });

  const ManagerSOSService = require(MODULES.TARGET);

  return {
    ManagerSOSService,
    state,
    createUserRecord,
    createSiteRecord,
    createSOSRecord,
  };
}

module.exports = {
  loadManagerSOSService,
  createUserRecord,
  createSiteRecord,
  createSOSRecord,
};
