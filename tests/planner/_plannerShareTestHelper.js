const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'pilgrim', 'plannerShareService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  EMAIL: path.join(ROOT, 'services', 'shared', 'emailService.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
  PLANNER_SERVICE: path.join(ROOT, 'services', 'plannerService.js'),
  PLANNER_CHAT: path.join(ROOT, 'services', 'pilgrim', 'plannerChatService.js'),
  PAYOS: path.join(ROOT, 'services', 'shared', 'payosService.js'),
  WALLET_SERVICE: path.join(ROOT, 'services', 'pilgrim', 'walletService.js'),
  FRIENDSHIP: path.join(ROOT, 'services', 'pilgrim', 'friendshipService.js'),
  DATABASE: path.join(ROOT, 'config', 'database.js'),
  QRCODE: require.resolve('qrcode'),
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

function loadPlannerShareService(overrides = {}) {
  clearModules();

  const state = {
    plannerFindByPkCalls: [],
    plannerInviteFindAllCalls: [],
    plannerInviteCountCalls: [],
    plannerInviteFindOneCalls: [],
    plannerInviteCreateCalls: [],
    plannerMemberCountCalls: [],
    plannerMemberFindOneCalls: [],
    plannerMemberCreateCalls: [],
    userFindOneCalls: [],
    userFindByPkCalls: [],
    transactionFindOneCalls: [],
    transactionCreateCalls: [],
    walletFindByPkCalls: [],
    walletGetOrCreateCalls: [],
    walletHandleTopupCalls: [],
    walletTxnCodeCalls: 0,
    payosGenerateOrderCodeCalls: 0,
    payosCreatePaymentLinkCalls: [],
    payosCancelPaymentLinkCalls: [],
    payosVerifyWebhookCalls: [],
    plannerChatCalls: [],
    emailCalls: [],
    notificationCreateCalls: [],
    qrCodeCalls: [],
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
    Planner: {
      findByPk: async (plannerId, options) => {
        state.plannerFindByPkCalls.push({ plannerId, options });
        if (overrides.plannerFindByPk) {
          return overrides.plannerFindByPk(plannerId, options, state);
        }
        return null;
      },
    },
    User: {
      findOne: async (options) => {
        state.userFindOneCalls.push(options);
        if (overrides.userFindOne) {
          return overrides.userFindOne(options, state);
        }
        return null;
      },
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    PlannerItem: {},
    Site: {},
    PlannerInvite: {
      findAll: async (options) => {
        state.plannerInviteFindAllCalls.push(options);
        if (overrides.plannerInviteFindAll) {
          return overrides.plannerInviteFindAll(options, state);
        }
        return [];
      },
      count: async (options) => {
        state.plannerInviteCountCalls.push(options);
        if (overrides.plannerInviteCount) {
          return overrides.plannerInviteCount(options, state);
        }
        return 0;
      },
      findOne: async (options) => {
        state.plannerInviteFindOneCalls.push(options);
        if (overrides.plannerInviteFindOne) {
          return overrides.plannerInviteFindOne(options, state);
        }
        return null;
      },
      create: async (data, options) => {
        state.plannerInviteCreateCalls.push({ data, options });
        if (overrides.plannerInviteCreate) {
          return overrides.plannerInviteCreate(data, options, state);
        }
        return {
          id: 'invite-id',
          ...data,
        };
      },
    },
    PlannerMember: {
      count: async (options) => {
        state.plannerMemberCountCalls.push(options);
        if (overrides.plannerMemberCount) {
          return overrides.plannerMemberCount(options, state);
        }
        return 0;
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
        return { id: 'planner-member-id', ...data };
      },
    },
    Wallet: {
      findByPk: async (walletId, options) => {
        state.walletFindByPkCalls.push({ walletId, options });
        if (overrides.walletFindByPk) {
          return overrides.walletFindByPk(walletId, options, state);
        }
        return null;
      },
    },
    Transaction: {
      findOne: async (options) => {
        state.transactionFindOneCalls.push(options);
        if (overrides.transactionFindOne) {
          return overrides.transactionFindOne(options, state);
        }
        return null;
      },
      create: async (data, options) => {
        state.transactionCreateCalls.push({ data, options });
        if (overrides.transactionCreate) {
          return overrides.transactionCreate(data, options, state);
        }
        return { id: 'transaction-id', ...data };
      },
    },
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    warn: (...args) => state.warnLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.EMAIL, {
    sendPlannerInvitation: async (...args) => {
      state.emailCalls.push(args);
      if (overrides.sendPlannerInvitation) {
        return overrides.sendPlannerInvitation(args, state);
      }
      return true;
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

  setMock(MODULES.PLANNER_SERVICE, {
    getPlannerState: async (plannerId, planner) => {
      if (overrides.getPlannerState) {
        return overrides.getPlannerState(plannerId, planner, state);
      }
      return {
        joinWindowClosed: false,
        scheduleComplete: true,
      };
    },
  });

  setMock(MODULES.PLANNER_CHAT, {
    sendSystemMessage: async (plannerId, message) => {
      state.plannerChatCalls.push({ plannerId, message });
      if (overrides.sendSystemMessage) {
        return overrides.sendSystemMessage(plannerId, message, state);
      }
      return true;
    },
  });

  setMock(MODULES.PAYOS, {
    verifyWebhookData: async (webhookData) => {
      state.payosVerifyWebhookCalls.push(webhookData);
      if (overrides.verifyWebhookData) {
        return overrides.verifyWebhookData(webhookData, state);
      }
      return { code: '00', data: { orderCode: '123456' } };
    },
    generateOrderCode: () => {
      state.payosGenerateOrderCodeCalls += 1;
      if (overrides.generateOrderCode) {
        return overrides.generateOrderCode(state);
      }
      return 123456;
    },
    createPaymentLink: async (amount, orderCode, description) => {
      state.payosCreatePaymentLinkCalls.push({ amount, orderCode, description });
      if (overrides.createPaymentLink) {
        return overrides.createPaymentLink(amount, orderCode, description, state);
      }
      return { checkoutUrl: 'https://pay.example/checkout', qrCode: 'data:image/png;base64,payos' };
    },
    cancelPaymentLink: async (orderCode) => {
      state.payosCancelPaymentLinkCalls.push(orderCode);
      if (overrides.cancelPaymentLink) {
        return overrides.cancelPaymentLink(orderCode, state);
      }
      return { cancelled: true };
    },
  });

  setMock(MODULES.WALLET_SERVICE, {
    getOrCreateWallet: async (userId) => {
      state.walletGetOrCreateCalls.push(userId);
      if (overrides.getOrCreateWallet) {
        return overrides.getOrCreateWallet(userId, state);
      }
      return { id: 'wallet-id', balance: 0, locked_balance: 0 };
    },
    generateTxnCode: () => {
      state.walletTxnCodeCalls += 1;
      if (overrides.generateTxnCode) {
        return overrides.generateTxnCode(state);
      }
      return 'TXN-CODE';
    },
    handleTopupWebhookByOrderCode: async (orderCode) => {
      state.walletHandleTopupCalls.push(orderCode);
      if (overrides.handleTopupWebhookByOrderCode) {
        return overrides.handleTopupWebhookByOrderCode(orderCode, state);
      }
      return null;
    },
  });

  setMock(MODULES.FRIENDSHIP, {
    areFriends: async () => true,
  });

  setMock(MODULES.DATABASE, {
    where: (...args) => ({ whereArgs: args }),
    fn: (...args) => ({ fnArgs: args }),
    col: (value) => ({ col: value }),
    transaction: async () => {
      state.transactionRequests += 1;
      if (overrides.transaction) {
        return overrides.transaction(transaction, state);
      }
      return transaction;
    },
  });

  setMock(MODULES.QRCODE, {
    toDataURL: async (...args) => {
      state.qrCodeCalls.push(args);
      if (overrides.qrCodeToDataURL) {
        return overrides.qrCodeToDataURL(args, state);
      }
      return 'data:image/png;base64,qr-code';
    },
  });

  const PlannerShareService = require(MODULES.TARGET);
  return { PlannerShareService, state };
}

module.exports = {
  loadPlannerShareService,
};
