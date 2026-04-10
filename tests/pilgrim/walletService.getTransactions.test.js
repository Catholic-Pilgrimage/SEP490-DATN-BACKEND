const test = require('node:test');
const assert = require('node:assert/strict');

const { loadWalletService } = require('./_walletTestHelper');

test('UTCID01: getTransactions returns wallet transactions with parsed amount and bank_info', async () => {
  const { WalletService, state, createWalletRecord, createTransactionRecord } = loadWalletService({
    walletFindOne: async () => createWalletRecord({
      id: 'wallet-1',
      user_id: 'user-id',
      balance: 100000,
      locked_balance: 20000,
      status: 'active',
    }),
    transactionFindAndCountAll: async () => ({
      count: 1,
      rows: [
        createTransactionRecord({
          id: 'txn-1',
          wallet_id: 'wallet-1',
          amount: '150000.50',
          type: 'topup',
          status: 'completed',
          bank_info: '{"bank_code":"VCB","account_number":"123456789"}',
          created_at: new Date('2026-04-10T01:00:00.000Z'),
        }),
      ],
    }),
  });

  const result = await WalletService.getTransactions('user-id');

  assert.deepEqual(state.transactionFindAndCountAllCalls[0], {
    where: { wallet_id: 'wallet-1' },
    order: [['created_at', 'DESC']],
    limit: 20,
    offset: 0,
  });
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].amount, 150000.5);
  assert.deepEqual(result.transactions[0].bank_info, {
    bank_code: 'VCB',
    account_number: '123456789',
  });
  assert.equal(result.total, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.currentPage, 1);
});

test('UTCID02: getTransactions applies type and status filters with second-page pagination', async () => {
  const { WalletService, state, createWalletRecord, createTransactionRecord } = loadWalletService({
    walletFindOne: async () => createWalletRecord({
      id: 'wallet-2',
      user_id: 'user-id',
      balance: 50000,
      locked_balance: 0,
      status: 'active',
    }),
    transactionFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createTransactionRecord({
          id: 'txn-2',
          wallet_id: 'wallet-2',
          amount: '300000',
          type: 'escrow_lock',
          status: 'completed',
          bank_info: { bank_code: 'ACB', account_name: 'User Two' },
          created_at: new Date('2026-04-10T02:00:00.000Z'),
        }),
      ],
    }),
  });

  const result = await WalletService.getTransactions('user-id', {
    type: 'escrow_lock',
    status: 'completed',
    page: '2',
    limit: '1',
  });

  assert.deepEqual(state.transactionFindAndCountAllCalls[0].where, {
    wallet_id: 'wallet-2',
    type: 'escrow_lock',
    status: 'completed',
  });
  assert.equal(state.transactionFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.transactionFindAndCountAllCalls[0].offset, 1);
  assert.equal(result.transactions[0].amount, 300000);
  assert.deepEqual(result.transactions[0].bank_info, {
    bank_code: 'ACB',
    account_name: 'User Two',
  });
  assert.equal(result.totalPages, 2);
  assert.equal(result.currentPage, 2);
});

test('UTCID03: getTransactions falls back to default pagination and null bank_info when JSON is invalid', async () => {
  const { WalletService, state, createWalletRecord, createTransactionRecord } = loadWalletService({
    walletFindOne: async () => createWalletRecord({
      id: 'wallet-3',
      user_id: 'user-id',
      balance: 0,
      locked_balance: 0,
      status: 'active',
    }),
    transactionFindAndCountAll: async () => ({
      count: 3,
      rows: [
        createTransactionRecord({
          id: 'txn-3',
          wallet_id: 'wallet-3',
          amount: '45000',
          type: 'withdraw',
          status: 'failed',
          bank_info: '{invalid-json}',
          created_at: new Date('2026-04-10T03:00:00.000Z'),
        }),
      ],
    }),
  });

  const result = await WalletService.getTransactions('user-id', {
    page: 'abc',
    limit: 'xyz',
  });

  assert.equal(state.transactionFindAndCountAllCalls[0].limit, 20);
  assert.equal(state.transactionFindAndCountAllCalls[0].offset, 0);
  assert.equal(result.transactions[0].amount, 45000);
  assert.equal(result.transactions[0].bank_info, null);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
});

test('UTCID04: getTransactions auto-creates a wallet and returns an empty history when the user has no wallet yet', async () => {
  const { WalletService, state } = loadWalletService({
    walletFindOne: async () => null,
    transactionFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await WalletService.getTransactions('user-id');

  assert.equal(state.walletCreateCalls.length, 1);
  assert.deepEqual(state.walletCreateCalls[0].data, {
    user_id: 'user-id',
    balance: 0,
    locked_balance: 0,
  });
  assert.deepEqual(result, {
    transactions: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'Wallet created for user user-id');
});

test('UTCID05: getTransactions logs and rethrows database errors', async () => {
  const { WalletService, state } = loadWalletService({
    walletFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    WalletService.getTransactions('user-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 2);
  assert.equal(state.errorLogs[0][0], 'Get/create wallet error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
  assert.equal(state.errorLogs[1][0], 'Get transactions error:');
  assert.equal(state.errorLogs[1][1].message, 'Database unavailable');
});
