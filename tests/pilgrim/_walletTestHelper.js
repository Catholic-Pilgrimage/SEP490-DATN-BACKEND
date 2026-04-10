const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'pilgrim', 'walletService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  DATABASE: path.join(ROOT, 'config', 'database.js'),
  PAYOS: path.join(ROOT, 'services', 'shared', 'payosService.js'),
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

function createWalletRecord(data, state, overrides = {}) {
  const record = {
    id: 'wallet-id',
    user_id: 'user-id',
    balance: 0,
    locked_balance: 0,
    status: 'active',
    ...data,
    async save(options) {
      state.walletSaveCalls.push({
        id: record.id,
        balance: record.balance,
        locked_balance: record.locked_balance,
        options,
      });
      if (overrides.walletSave) {
        return overrides.walletSave(record, options, state);
      }
      return record;
    },
  };

  return record;
}

function createTransactionRecord(data, state, overrides = {}) {
  const record = {
    id: 'txn-id',
    ...data,
    toJSON() {
      return { ...record };
    },
    async save(options) {
      state.transactionSaveCalls.push({
        id: record.id,
        status: record.status,
        options,
      });
      if (overrides.transactionSave) {
        return overrides.transactionSave(record, options, state);
      }
      return record;
    },
  };

  return record;
}

function loadWalletService(overrides = {}) {
  clearModules();

  const state = {
    walletFindOneCalls: [],
    walletFindByPkCalls: [],
    walletCreateCalls: [],
    walletSaveCalls: [],
    transactionFindAndCountAllCalls: [],
    transactionFindOneCalls: [],
    transactionCreateCalls: [],
    transactionSaveCalls: [],
    dbTransactionCalls: 0,
    dbCommitCalls: 0,
    dbRollbackCalls: 0,
    payosCreatePaymentLinkCalls: [],
    payosGenerateOrderCodeCalls: 0,
    infoLogs: [],
    errorLogs: [],
  };

  const walletModel = {
    findOne: async (options) => {
      state.walletFindOneCalls.push(options);
      if (overrides.walletFindOne) {
        return overrides.walletFindOne(options, state);
      }
      return null;
    },
    findByPk: async (id, options) => {
      state.walletFindByPkCalls.push({ id, options });
      if (overrides.walletFindByPk) {
        return overrides.walletFindByPk(id, options, state);
      }
      return null;
    },
    create: async (data, options) => {
      state.walletCreateCalls.push({ data, options });
      if (overrides.walletCreate) {
        return overrides.walletCreate(data, options, state);
      }
      return createWalletRecord({
        id: 'wallet-id',
        user_id: data.user_id,
        balance: data.balance,
        locked_balance: data.locked_balance,
        status: 'active',
      }, state, overrides);
    },
  };

  const transactionModel = {
    findAndCountAll: async (options) => {
      state.transactionFindAndCountAllCalls.push(options);
      if (overrides.transactionFindAndCountAll) {
        return overrides.transactionFindAndCountAll(options, state);
      }
      return { count: 0, rows: [] };
    },
    findOne: async (options) => {
      state.transactionFindOneCalls.push(options);
      if (overrides.transactionFindOne) {
        return overrides.transactionFindOne(options, state);
      }
      return null;
    },
    create: async (data) => {
      state.transactionCreateCalls.push(data);
      if (overrides.transactionCreate) {
        return overrides.transactionCreate(data, state);
      }
      return createTransactionRecord(data, state, overrides);
    },
  };

  const sequelize = {
    transaction: async () => {
      state.dbTransactionCalls += 1;
      const tx = {
        finished: false,
        async commit() {
          state.dbCommitCalls += 1;
          tx.finished = 'commit';
        },
        async rollback() {
          state.dbRollbackCalls += 1;
          tx.finished = 'rollback';
        },
      };
      return tx;
    },
    literal: (sql) => ({ __literal: sql }),
  };

  setMock(MODULES.MODELS, {
    Wallet: walletModel,
    Transaction: transactionModel,
    User: {},
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.DATABASE, sequelize);

  setMock(MODULES.PAYOS, {
    generateOrderCode: () => {
      state.payosGenerateOrderCodeCalls += 1;
      return overrides.orderCode || 987654321;
    },
    createPaymentLink: async (...args) => {
      state.payosCreatePaymentLinkCalls.push(args);
      if (overrides.createPaymentLink) {
        return overrides.createPaymentLink(args, state);
      }
      return {
        checkoutUrl: 'https://pay.payos.vn/checkout',
        qrCode: 'qr-code',
        orderCode: overrides.orderCode || 987654321,
        amount: args[0],
      };
    },
  });

  const WalletService = require(MODULES.TARGET);

  return {
    WalletService,
    state,
    createWalletRecord: (data) => createWalletRecord(data, state, overrides),
    createTransactionRecord: (data) => createTransactionRecord(data, state, overrides),
  };
}

module.exports = {
  loadWalletService,
  createWalletRecord,
  createTransactionRecord,
};
