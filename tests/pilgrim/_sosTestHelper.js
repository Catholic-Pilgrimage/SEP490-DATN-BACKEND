const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'pilgrim', 'sosService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  NOTIFICATION_SERVICE: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  APP_CONFIG: path.join(ROOT, 'config', 'app.config.js'),
  PLANNER_CHAT_SERVICE: path.join(ROOT, 'services', 'pilgrim', 'plannerChatService.js'),
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

function createSOSRecord(data, state, overrides = {}) {
  const record = {
    id: 'sos-id',
    code: 'SOS0410001',
    user_id: 'user-id',
    site_id: 'site-id',
    status: 'pending',
    latitude: 16.3001,
    longitude: 107.5902,
    message: 'Need urgent help',
    contact_phone: '0900000000',
    created_at: new Date('2026-04-10T00:00:00.000Z'),
    updated_at: new Date('2026-04-10T00:00:00.000Z'),
    ...data,
    update: async (values, options) => {
      state.sosUpdateCalls.push({ id: record.id, values, options });
      Object.assign(record, values);
      if (overrides.sosInstanceUpdate) {
        return overrides.sosInstanceUpdate(record, values, options, state);
      }
      return record;
    },
    toJSON: () => ({
      ...record,
    }),
  };

  return record;
}

function createUserRecord(data) {
  return {
    id: 'user-id',
    full_name: 'Pilgrim User',
    phone: '0900000000',
    role: 'pilgrim',
    status: 'active',
    ...data,
  };
}

function createSiteRecord(data) {
  return {
    id: 'site-id',
    name: 'La Vang Shrine',
    address: 'Hue',
    province: 'Hue',
    ...data,
  };
}

function createPlannerRecord(data) {
  return {
    id: 'planner-id',
    user_id: 'owner-id',
    status: 'ongoing',
    name: 'Pilgrimage Planner',
    ...data,
  };
}

function loadPilgrimSOSService(overrides = {}) {
  clearModules();

  const state = {
    sosFindOneCalls: [],
    sosFindAndCountAllCalls: [],
    sosCreateCalls: [],
    sosFindByPkCalls: [],
    sosUpdateCalls: [],
    userFindByPkCalls: [],
    siteFindByPkCalls: [],
    guideShiftSubmissionFindAllCalls: [],
    plannerMemberFindAllCalls: [],
    plannerFindAllCalls: [],
    plannerFindByPkCalls: [],
    plannerMessageCreateCalls: [],
    plannerChatCalls: [],
    createNotificationCalls: [],
    notifySiteManagerCalls: [],
    infoLogs: [],
    warnLogs: [],
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
      create: async (data, options) => {
        state.sosCreateCalls.push({ data, options });
        if (overrides.sosCreate) {
          return overrides.sosCreate(data, options, state);
        }
        return createSOSRecord(data, state, overrides);
      },
      findByPk: async (sosId, options) => {
        state.sosFindByPkCalls.push({ sosId, options });
        if (overrides.sosFindByPk) {
          return overrides.sosFindByPk(sosId, options, state);
        }
        return null;
      },
      findAndCountAll: async (options) => {
        state.sosFindAndCountAllCalls.push(options);
        if (overrides.sosFindAndCountAll) {
          return overrides.sosFindAndCountAll(options, state);
        }
        return { count: 0, rows: [] };
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
    Site: {
      findByPk: async (siteId, options) => {
        state.siteFindByPkCalls.push({ siteId, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(siteId, options, state);
        }
        return null;
      },
    },
    GuideShiftSubmission: {
      findAll: async (options) => {
        state.guideShiftSubmissionFindAllCalls.push(options);
        if (overrides.guideShiftSubmissionFindAll) {
          return overrides.guideShiftSubmissionFindAll(options, state);
        }
        return [];
      },
    },
    GuideShift: {},
    Planner: {
      findAll: async (options) => {
        state.plannerFindAllCalls.push(options);
        if (overrides.plannerFindAll) {
          return overrides.plannerFindAll(options, state);
        }
        return [];
      },
      findByPk: async (plannerId, options) => {
        state.plannerFindByPkCalls.push({ plannerId, options });
        if (overrides.plannerFindByPk) {
          return overrides.plannerFindByPk(plannerId, options, state);
        }
        return null;
      },
    },
    PlannerMember: {
      findAll: async (options) => {
        state.plannerMemberFindAllCalls.push(options);
        if (overrides.plannerMemberFindAll) {
          return overrides.plannerMemberFindAll(options, state);
        }
        return [];
      },
    },
    PlannerMessage: {
      create: async (data, options) => {
        state.plannerMessageCreateCalls.push({ data, options });
        if (overrides.plannerMessageCreate) {
          return overrides.plannerMessageCreate(data, options, state);
        }
        return {
          id: 'planner-message-id',
          ...data,
        };
      },
    },
    Event: {
      findAll: async (options) => {
        state.eventFindAllCalls = state.eventFindAllCalls || [];
        state.eventFindAllCalls.push(options);
        if (overrides.eventFindAll) {
          return overrides.eventFindAll(options, state);
        }
        return [];
      }
    }
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    warn: (...args) => state.warnLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION_SERVICE, {
    createNotification: async (...args) => {
      state.createNotificationCalls.push(args);
      if (overrides.createNotification) {
        return overrides.createNotification(...args, state);
      }
      return { id: 'notification-id' };
    },
    notifySiteManager: async (...args) => {
      state.notifySiteManagerCalls.push(args);
      if (overrides.notifySiteManager) {
        return overrides.notifySiteManager(...args, state);
      }
      return { id: 'manager-notification-id' };
    },
  });

  setMock(MODULES.APP_CONFIG, {
    timezone: 'Asia/Saigon',
  });

  setMock(MODULES.PLANNER_CHAT_SERVICE, {
    sendSystemMessage: async (plannerId, content) => {
      state.plannerChatCalls.push({ plannerId, content });
      if (overrides.sendSystemMessage) {
        return overrides.sendSystemMessage(plannerId, content, state);
      }
      return { id: 'planner-chat-message-id', plannerId, content };
    },
  });

  const PilgrimSOSService = require(MODULES.TARGET);

  return {
    PilgrimSOSService,
    state,
    createSOSRecord: (data) => createSOSRecord(data, state, overrides),
    createUserRecord,
    createSiteRecord,
    createPlannerRecord,
  };
}

module.exports = {
  loadPilgrimSOSService,
  createSOSRecord,
  createUserRecord,
  createSiteRecord,
  createPlannerRecord,
};
