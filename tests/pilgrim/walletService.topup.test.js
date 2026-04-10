const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  WALLET_SERVICE: path.join(ROOT, 'services', 'pilgrim', 'walletService.js'),
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

function createWalletRecord(data, state) {
  const record = {
    ...data,
    async save(options) {
      state.walletSaveCalls.push({
        id: record.id,
        balance: record.balance,
        locked_balance: record.locked_balance,
        options,
      });
      return record;
    },
  };
  return record;
}

function createTransactionRecord(data, state) {
  const record = {
    ...data,
    async save(options) {
      state.transactionSaveCalls.push({
        id: record.id,
        status: record.status,
        options,
      });
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
    transactionCreateCalls: [],
    transactionFindOneCalls: [],
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
      }, state);
    },
  };

  const transactionModel = {
    create: async (data) => {
      state.transactionCreateCalls.push(data);
      if (overrides.transactionCreate) {
        return overrides.transactionCreate(data, state);
      }
      return createTransactionRecord({
        id: 'txn-id',
        ...data,
      }, state);
    },
    findOne: async (options) => {
      state.transactionFindOneCalls.push(options);
      if (overrides.transactionFindOne) {
        return overrides.transactionFindOne(options, state);
      }
      return null;
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

  const WalletService = require(MODULES.WALLET_SERVICE);
  return {
    WalletService,
    state,
    createWalletRecord: (data) => createWalletRecord(data, state),
    createTransactionRecord: (data) => createTransactionRecord(data, state),
  };
}

test('WTID01: createTopup creates pending topup transaction and returns checkout data', async () => {
  const { WalletService, state, createWalletRecord } = loadWalletService({
    walletFindOne: async () => createWalletRecord({
      id: 'wallet-1',
      user_id: 'user-1',
      balance: 100000,
      locked_balance: 0,
      status: 'active',
    }),
    orderCode: 123456789,
  });

  const result = await WalletService.createTopup('user-1', 150000);

  assert.equal(state.transactionCreateCalls[0].type, 'topup');
  assert.equal(state.transactionCreateCalls[0].status, 'pending');
  assert.equal(state.transactionCreateCalls[0].reference_type, 'wallet_topup');
  assert.equal(state.transactionCreateCalls[0].reference_id, 'wallet-1:user-1:123456789');
  assert.deepEqual(state.payosCreatePaymentLinkCalls[0], [150000, 123456789, 'Nạp tiền vào ví']);
  assert.equal(result.order_code, 123456789);
  assert.equal(result.checkout_url, 'https://pay.payos.vn/checkout');
  assert.equal(result.amount, 150000);
});

test('WTID02: handleTopupWebhookByOrderCode completes transaction and credits wallet balance', async () => {
  const { WalletService, state, createWalletRecord, createTransactionRecord } = loadWalletService({
    transactionFindOne: async () => createTransactionRecord({
      id: 'txn-1',
      wallet_id: 'wallet-1',
      amount: 50000,
      type: 'topup',
      status: 'pending',
      reference_type: 'wallet_topup',
      reference_id: 'wallet-1:user-1:123456789',
    }),
    walletFindByPk: async () => createWalletRecord({
      id: 'wallet-1',
      user_id: 'user-1',
      balance: 100000,
      locked_balance: 0,
      status: 'active',
    }),
  });

  const result = await WalletService.handleTopupWebhookByOrderCode('123456789');

  assert.equal(result.success, true);
  assert.equal(result.messageKey, 'wallet.topup_completed');
  assert.equal(state.transactionSaveCalls[0].status, 'completed');
  assert.equal(state.walletSaveCalls[0].balance, 150000);
  assert.equal(state.dbCommitCalls, 1);
  assert.equal(state.dbRollbackCalls, 0);
});

test('WTID03: handleTopupWebhookByOrderCode returns null when order does not belong to wallet topup', async () => {
  const { WalletService, state } = loadWalletService({
    transactionFindOne: async () => null,
  });

  const result = await WalletService.handleTopupWebhookByOrderCode('missing-order');

  assert.equal(result, null);
  assert.equal(state.dbRollbackCalls, 1);
});
