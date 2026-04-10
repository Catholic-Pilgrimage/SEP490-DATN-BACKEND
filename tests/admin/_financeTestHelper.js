const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'admin', 'financeService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  DB: path.join(ROOT, 'config', 'database.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
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

function createTransactionRecord(data) {
  return {
    id: 'txn-id',
    amount: '100000',
    type: 'topup',
    status: 'completed',
    reference_type: 'wallet_topup',
    reference_id: 'wallet-1:user-id:123456',
    description: 'Topup',
    created_at: new Date('2026-04-10T00:00:00.000Z'),
    wallet: {
      id: 'wallet-1',
      user: {
        id: 'user-id',
        full_name: 'Pilgrim User',
        email: 'user@example.com',
        avatar_url: 'https://cdn.example.com/user.jpg',
      },
    },
    ...data,
  };
}

function loadAdminFinanceService(overrides = {}) {
  clearModules();

  const state = {
    transactionFindAndCountAllCalls: [],
    transactionFindByPkCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    Transaction: {
      findAndCountAll: async (options) => {
        state.transactionFindAndCountAllCalls.push(options);
        if (overrides.transactionFindAndCountAll) {
          return overrides.transactionFindAndCountAll(options, state);
        }
        return { count: 0, rows: [] };
      },
      findByPk: async (id, options) => {
        state.transactionFindByPkCalls.push({ id, options });
        if (overrides.transactionFindByPk) {
          return overrides.transactionFindByPk(id, options, state);
        }
        return null;
      },
    },
    Wallet: {},
    User: {},
    Planner: {},
    PlannerMember: {},
  });

  setMock(MODULES.DB, {
    literal: (sql) => ({ __literal: sql }),
    QueryTypes: {
      SELECT: 'SELECT',
    },
    query: async () => [],
    fn: (...args) => ({ __fn: args }),
    col: (name) => ({ __col: name }),
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  const AdminFinanceService = require(MODULES.TARGET);
  return {
    AdminFinanceService,
    state,
    createTransactionRecord,
  };
}

module.exports = {
  loadAdminFinanceService,
  createTransactionRecord,
};
