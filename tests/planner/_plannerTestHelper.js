const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'plannerService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  POST_SERVICE: path.join(ROOT, 'services', 'postService.js'),
  PLANNER_ACCESS: path.join(ROOT, 'utils', 'plannerAccess.util.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  DATABASE: path.join(ROOT, 'config', 'database.js'),
  EMAIL: path.join(ROOT, 'services', 'shared', 'emailService.js'),
  TIME_CALCULATION: path.join(ROOT, 'utils', 'timeCalculation.util.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  PAYOS: path.join(ROOT, 'services', 'shared', 'payosService.js'),
  WALLET_SERVICE: path.join(ROOT, 'services', 'pilgrim', 'walletService.js'),
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

function createPlannerInstance(data, state, overrides = {}) {
  const record = {
    is_active: true,
    created_at: new Date('2026-04-07T00:00:00.000Z'),
    updated_at: new Date('2026-04-07T00:00:00.000Z'),
    ...data,
    get: ({ plain } = {}) => {
      if (!plain) {
        return record;
      }
      return {
        ...record,
      };
    },
    update: async (values, options) => {
      state.plannerInstanceUpdateCalls.push({ id: record.id, values, options });
      Object.assign(record, values);
      if (overrides.plannerInstanceUpdate) {
        return overrides.plannerInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };

  return record;
}

function loadPlannerService(overrides = {}) {
  clearModules();

  const state = {
    plannerFindAllCalls: [],
    plannerFindAndCountAllCalls: [],
    plannerFindByPkCalls: [],
    plannerCreateCalls: [],
    plannerInstanceUpdateCalls: [],
    plannerMemberFindAllCalls: [],
    plannerMemberFindOneCalls: [],
    plannerMemberCreateCalls: [],
    plannerInviteFindOneCalls: [],
    plannerInviteUpdateCalls: [],
    plannerItemFindAllCalls: [],
    plannerItemCountCalls: [],
    plannerItemFindOneCalls: [],
    plannerItemFindByPkCalls: [],
    plannerItemCreateCalls: [],
    plannerItemBulkCreateCalls: [],
    plannerItemMaxCalls: [],
    plannerItemDecrementCalls: [],
    siteFindByPkCalls: [],
    eventFindByPkCalls: [],
    nearbyPlaceFindAllCalls: [],
    postFindOneCalls: [],
    postFindByPkCalls: [],
    postCreateCalls: [],
    transactionFindAllCalls: [],
    walletRefundCalls: [],
    notificationCreateCalls: [],
    payosCancelCalls: [],
    antiFraudCalls: [],
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

  const plannerModel = {
    findAll: async (options) => {
      state.plannerFindAllCalls.push(options);
      if (overrides.plannerFindAll) {
        return overrides.plannerFindAll(options, state);
      }
      return [];
    },
    findAndCountAll: async (options) => {
      state.plannerFindAndCountAllCalls.push(options);
      if (overrides.plannerFindAndCountAll) {
        return overrides.plannerFindAndCountAll(options, state);
      }
      return { rows: [], count: 0 };
    },
    findByPk: async (plannerId, options) => {
      state.plannerFindByPkCalls.push({ plannerId, options });
      if (overrides.plannerFindByPk) {
        return overrides.plannerFindByPk(plannerId, options, state);
      }
      return null;
    },
    create: async (data, options) => {
      state.plannerCreateCalls.push({ data, options });
      if (overrides.plannerCreate) {
        return overrides.plannerCreate(data, options, state);
      }
      return createPlannerInstance(
        {
          id: 'planner-id',
          ...data,
        },
        state,
        overrides
      );
    },
  };

  const plannerMemberModel = {
    findAll: async (options) => {
      state.plannerMemberFindAllCalls.push(options);
      if (overrides.plannerMemberFindAll) {
        return overrides.plannerMemberFindAll(options, state);
      }
      return [];
    },
    findOne: async (options) => {
      state.plannerMemberFindOneCalls.push(options);
      if (overrides.plannerMemberFindOne) {
        return overrides.plannerMemberFindOne(options, state);
      }
      return null;
    },
    create: async (data, options) => {
      state.plannerMemberCreateCalls.push({ data, options });
      if (overrides.plannerMemberCreate) {
        return overrides.plannerMemberCreate(data, options, state);
      }
      return {
        id: 'planner-member-id',
        ...data,
      };
    },
  };

  setMock(MODULES.MODELS, {
    Planner: plannerModel,
    PlannerItem: {
      findAll: async (options) => {
        state.plannerItemFindAllCalls.push(options);
        if (overrides.plannerItemFindAll) {
          return overrides.plannerItemFindAll(options, state);
        }
        return [];
      },
      findOne: async (options) => {
        state.plannerItemFindOneCalls.push(options);
        if (overrides.plannerItemFindOne) {
          return overrides.plannerItemFindOne(options, state);
        }
        return null;
      },
      findByPk: async (itemId, options) => {
        state.plannerItemFindByPkCalls.push({ itemId, options });
        if (overrides.plannerItemFindByPk) {
          return overrides.plannerItemFindByPk(itemId, options, state);
        }
        return null;
      },
      create: async (data, options) => {
        state.plannerItemCreateCalls.push({ data, options });
        if (overrides.plannerItemCreate) {
          return overrides.plannerItemCreate(data, options, state);
        }
        return {
          id: 'planner-item-id',
          ...data,
        };
      },
      bulkCreate: async (rows, options) => {
        state.plannerItemBulkCreateCalls.push({ rows, options });
        if (overrides.plannerItemBulkCreate) {
          return overrides.plannerItemBulkCreate(rows, options, state);
        }
        return rows.map((row, index) => ({
          id: `planner-item-${index + 1}`,
          ...row,
        }));
      },
      max: async (field, options) => {
        state.plannerItemMaxCalls.push({ field, options });
        if (overrides.plannerItemMax) {
          return overrides.plannerItemMax(field, options, state);
        }
        return null;
      },
      decrement: async (field, options) => {
        state.plannerItemDecrementCalls.push({ field, options });
        if (overrides.plannerItemDecrement) {
          return overrides.plannerItemDecrement(field, options, state);
        }
        return [1];
      },
      count: async (options) => {
        state.plannerItemCountCalls.push(options);
        if (overrides.plannerItemCount) {
          return overrides.plannerItemCount(options, state);
        }
        return 0;
      },
    },
    User: {},
    Site: {
      findByPk: async (siteId, options) => {
        state.siteFindByPkCalls.push({ siteId, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(siteId, options, state);
        }
        return null;
      },
    },
    Event: {
      findByPk: async (eventId, options) => {
        state.eventFindByPkCalls.push({ eventId, options });
        if (overrides.eventFindByPk) {
          return overrides.eventFindByPk(eventId, options, state);
        }
        return null;
      },
    },
    PlannerInvite: {
      findOne: async (options) => {
        state.plannerInviteFindOneCalls.push(options);
        if (overrides.plannerInviteFindOne) {
          return overrides.plannerInviteFindOne(options, state);
        }
        return null;
      },
      update: async (values, options) => {
        state.plannerInviteUpdateCalls.push({ values, options });
        if (overrides.plannerInviteUpdate) {
          return overrides.plannerInviteUpdate(values, options, state);
        }
        return [0];
      },
    },
    PlannerMember: plannerMemberModel,
    Transaction: {
      findAll: async (options) => {
        state.transactionFindAllCalls.push(options);
        if (overrides.transactionFindAll) {
          return overrides.transactionFindAll(options, state);
        }
        return [];
      },
    },
    Wallet: {},
    NearbyPlace: {
      findAll: async (options) => {
        state.nearbyPlaceFindAllCalls.push(options);
        if (overrides.nearbyPlaceFindAll) {
          return overrides.nearbyPlaceFindAll(options, state);
        }
        return [];
      },
    },
    Post: {
      findOne: async (options) => {
        state.postFindOneCalls.push(options);
        if (overrides.postFindOne) {
          return overrides.postFindOne(options, state);
        }
        return null;
      },
      findByPk: async (postId, options) => {
        state.postFindByPkCalls.push({ postId, options });
        if (overrides.postFindByPk) {
          return overrides.postFindByPk(postId, options, state);
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
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    warn: (...args) => state.warnLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.DATABASE, {
    transaction: async () => {
      state.transactionRequests += 1;
      if (overrides.transaction) {
        return overrides.transaction(transaction, state);
      }
      return transaction;
    },
    fn: (...args) => ({ fnArgs: args }),
    col: (value) => ({ col: value }),
  });

  setMock(MODULES.EMAIL, {});

  setMock(MODULES.POST_SERVICE, {
    getPostIncludes: () => {
      if (overrides.postServiceGetPostIncludes) {
        return overrides.postServiceGetPostIncludes(state);
      }
      return ['post-includes'];
    },
    formatPostResponse: async (post) => {
      if (overrides.postServiceFormatPostResponse) {
        return overrides.postServiceFormatPostResponse(post, state);
      }
      return {
        id: post.id,
        formatted: true,
      };
    },
  });

  setMock(MODULES.NOTIFICATION, {
    createNotification: async (type, receiverId, data) => {
      state.notificationCreateCalls.push({ type, receiverId, data });
      if (overrides.notificationCreate) {
        return overrides.notificationCreate(type, receiverId, data, state);
      }
      return { id: 'notification-id', type, receiverId, data };
    },
  });

  setMock(MODULES.PAYOS, {
    cancelPaymentLink: async (orderCode) => {
      state.payosCancelCalls.push(orderCode);
      if (overrides.payosCancelPaymentLink) {
        return overrides.payosCancelPaymentLink(orderCode, state);
      }
      return { cancelled: true };
    },
  });

  setMock(MODULES.WALLET_SERVICE, {
    refundOnKick: async (userId, amount, plannerId, plannerName, transactionArg) => {
      state.walletRefundCalls.push({ userId, amount, plannerId, plannerName, transaction: transactionArg });
      if (overrides.walletRefundOnKick) {
        return overrides.walletRefundOnKick(userId, amount, plannerId, plannerName, transactionArg, state);
      }
      return { refunded: true };
    },
  });

  setMock(MODULES.PLANNER_ANTIFRAUD, {
    verifyAndSettlePlanner: async (plannerId, transactionArg) => {
      state.antiFraudCalls.push({ plannerId, transaction: transactionArg });
      if (overrides.verifyAndSettlePlanner) {
        return overrides.verifyAndSettlePlanner(plannerId, transactionArg, state);
      }
      return { settled: true };
    },
  });

  setMock(MODULES.TIME_CALCULATION, {
    calculateEstimatedTime: () => '01:00',
    parseDurationToMinutes: () => 60,
    isWithinOpeningHours: () => true,
    addMinutesToTime: () => '09:00',
  });

  const PlannerService = require(MODULES.TARGET);
  return {
    PlannerService,
    state,
    createPlannerInstance: (data) => createPlannerInstance(data, state, overrides),
  };
}

module.exports = {
  loadPlannerService,
};
