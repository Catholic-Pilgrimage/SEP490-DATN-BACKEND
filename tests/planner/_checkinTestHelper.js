const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'checkinService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  PLANNER_ACCESS: path.join(ROOT, 'utils', 'plannerAccess.util.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  OSRM: path.join(ROOT, 'utils', 'osrm.util.js'),
  DATABASE: path.join(ROOT, 'config', 'database.js'),
  PLANNER_SERVICE: path.join(ROOT, 'services', 'plannerService.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  PLANNER_ANTIFRAUD: path.join(ROOT, 'services', 'pilgrim', 'plannerAntiFraudService.js'),
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

function createUpdatableRecord(state, bucketName, data = {}) {
  const record = {
    ...data,
    update: async (values, options) => {
      state[bucketName].push({ target: record.id || null, values, options });
      Object.assign(record, values);
      return record;
    },
  };

  return record;
}

function loadCheckinService(overrides = {}) {
  clearModules();

  const state = {
    plannerItemFindByPkCalls: [],
    plannerItemFindAllCalls: [],
    plannerItemUpdateCalls: [],
    plannerFindByPkCalls: [],
    plannerMemberFindOneCalls: [],
    plannerMemberFindAllCalls: [],
    userCheckinFindOneCalls: [],
    userCheckinFindAllCalls: [],
    userCheckinFindOrCreateCalls: [],
    userCheckinCountCalls: [],
    userCheckinBulkCreateCalls: [],
    userCheckinUpdateCalls: [],
    plannerUpdateCalls: [],
    userFindAllCalls: [],
    sosRequestFindOneCalls: [],
    osrmCalls: [],
    notificationCreateCalls: [],
    antiFraudCalls: [],
    plannerServiceGetCheckinStatsCalls: [],
    plannerServiceGetNextUpcomingCalls: [],
    plannerServiceNotifyCalls: [],
    transactionRequests: 0,
    transactionCommitCalls: 0,
    transactionRollbackCalls: 0,
    infoLogs: [],
    warnLogs: [],
    errorLogs: [],
  };

  const transaction = {
    id: 'tx-1',
    finished: null,
    commit: async () => {
      state.transactionCommitCalls += 1;
      transaction.finished = 'commit';
    },
    rollback: async () => {
      state.transactionRollbackCalls += 1;
      transaction.finished = 'rollback';
    },
  };

  setMock(MODULES.MODELS, {
    PlannerItem: {
      findByPk: async (itemId, options) => {
        state.plannerItemFindByPkCalls.push({ itemId, options });
        if (overrides.plannerItemFindByPk) {
          return overrides.plannerItemFindByPk(itemId, options, state);
        }
        return null;
      },
      findAll: async (options) => {
        state.plannerItemFindAllCalls.push(options);
        if (overrides.plannerItemFindAll) {
          return overrides.plannerItemFindAll(options, state);
        }
        return [];
      },
    },
    Site: {},
    UserCheckin: {
      findOne: async (options) => {
        state.userCheckinFindOneCalls.push(options);
        if (overrides.userCheckinFindOne) {
          return overrides.userCheckinFindOne(options, state);
        }
        return null;
      },
      findAll: async (options) => {
        state.userCheckinFindAllCalls.push(options);
        if (overrides.userCheckinFindAll) {
          return overrides.userCheckinFindAll(options, state);
        }
        return [];
      },
      findOrCreate: async (options) => {
        state.userCheckinFindOrCreateCalls.push(options);
        if (overrides.userCheckinFindOrCreate) {
          return overrides.userCheckinFindOrCreate(options, state);
        }
        const record = createUpdatableRecord(state, 'userCheckinUpdateCalls', {
          id: 'checkin-id',
          ...options.defaults,
        });
        return [record, true];
      },
      count: async (options) => {
        state.userCheckinCountCalls.push(options);
        if (overrides.userCheckinCount) {
          return overrides.userCheckinCount(options, state);
        }
        return 0;
      },
      bulkCreate: async (rows, options) => {
        state.userCheckinBulkCreateCalls.push({ rows, options });
        if (overrides.userCheckinBulkCreate) {
          return overrides.userCheckinBulkCreate(rows, options, state);
        }
        return rows;
      },
      update: async (values, options) => {
        state.userCheckinUpdateCalls.push({ values, options });
        if (overrides.userCheckinUpdate) {
          return overrides.userCheckinUpdate(values, options, state);
        }
        return [0];
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
      findAll: async (options) => {
        state.plannerMemberFindAllCalls.push(options);
        if (overrides.plannerMemberFindAll) {
          return overrides.plannerMemberFindAll(options, state);
        }
        return [];
      },
    },
    User: {
      findAll: async (options) => {
        state.userFindAllCalls.push(options);
        if (overrides.userFindAll) {
          return overrides.userFindAll(options, state);
        }
        return [];
      },
    },
    SOSRequest: {
      findOne: async (options) => {
        state.sosRequestFindOneCalls.push(options);
        if (overrides.sosRequestFindOne) {
          return overrides.sosRequestFindOne(options, state);
        }
        return null;
      },
    },
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    warn: (...args) => state.warnLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.OSRM, {
    getRouteInfo: async (...args) => {
      state.osrmCalls.push(args);
      if (overrides.getRouteInfo) {
        return overrides.getRouteInfo(...args, state);
      }
      return { distance: 120 };
    },
  });

  setMock(MODULES.DATABASE, {
    transaction: async () => {
      state.transactionRequests += 1;
      if (overrides.transaction) {
        return overrides.transaction(transaction, state);
      }
      return transaction;
    },
  });

  setMock(MODULES.PLANNER_SERVICE, {
    getCheckinStats: async (plannerId) => {
      state.plannerServiceGetCheckinStatsCalls.push({ plannerId });
      if (overrides.getCheckinStats) {
        return overrides.getCheckinStats(plannerId, state);
      }
      return { totalItems: 0, checkedInItems: 0, visitedCount: 0 };
    },
    getNextUpcomingPlannerItem: async (plannerId, options) => {
      state.plannerServiceGetNextUpcomingCalls.push({ plannerId, options });
      if (overrides.getNextUpcomingPlannerItem) {
        return overrides.getNextUpcomingPlannerItem(plannerId, options, state);
      }
      return null;
    },
    notifyOngoingPlannerMembers: async (planner, type, data, options) => {
      state.plannerServiceNotifyCalls.push({ planner, type, data, options });
      if (overrides.notifyOngoingPlannerMembers) {
        return overrides.notifyOngoingPlannerMembers(planner, type, data, options, state);
      }
      return [];
    },
  });

  setMock(MODULES.NOTIFICATION, {
    createNotification: async (type, receiverId, data) => {
      state.notificationCreateCalls.push({ type, receiverId, data });
      if (overrides.notificationCreate) {
        return overrides.notificationCreate(type, receiverId, data, state);
      }
      return { id: `notification-${receiverId}` };
    },
  });

  setMock(MODULES.PLANNER_ANTIFRAUD, {
    verifyAndSettlePlanner: async (plannerId, transaction) => {
      state.antiFraudCalls.push({ plannerId, transaction });
      if (overrides.verifyAndSettlePlanner) {
        return overrides.verifyAndSettlePlanner(plannerId, transaction, state);
      }
      return { settled: true };
    },
  });

  const CheckinService = require(MODULES.TARGET);

  return {
    CheckinService,
    state,
    createUpdatableRecord: (bucketName, data) => createUpdatableRecord(state, bucketName, data),
  };
}

module.exports = {
  loadCheckinService,
};
