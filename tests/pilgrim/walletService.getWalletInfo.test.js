const test = require('node:test');
const assert = require('node:assert/strict');

const { loadWalletService } = require('./_walletTestHelper');

test('UTCID01: getWalletInfo returns parsed wallet balances and total balance for an existing wallet', async () => {
  const { WalletService, state, createWalletRecord } = loadWalletService({
    walletFindOne: async () => createWalletRecord({
      id: 'wallet-1',
      user_id: 'user-id',
      balance: '125000.50',
      locked_balance: '24500.25',
      status: 'active',
    }),
  });

  const result = await WalletService.getWalletInfo('user-id');

  assert.equal(state.walletFindOneCalls.length, 1);
  assert.deepEqual(state.walletFindOneCalls[0], {
    where: { user_id: 'user-id' },
    transaction: null,
    lock: undefined,
  });
  assert.deepEqual(result, {
    id: 'wallet-1',
    balance: 125000.5,
    locked_balance: 24500.25,
    total_balance: 149500.75,
    status: 'active',
  });
  assert.equal(state.walletCreateCalls.length, 0);
});

test('UTCID02: getWalletInfo creates a new wallet automatically when the user has no wallet yet', async () => {
  const { WalletService, state } = loadWalletService({
    walletFindOne: async () => null,
  });

  const result = await WalletService.getWalletInfo('user-id');

  assert.equal(state.walletCreateCalls.length, 1);
  assert.deepEqual(state.walletCreateCalls[0].data, {
    user_id: 'user-id',
    balance: 0,
    locked_balance: 0,
  });
  assert.deepEqual(result, {
    id: 'wallet-id',
    balance: 0,
    locked_balance: 0,
    total_balance: 0,
    status: 'active',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'Wallet created for user user-id');
});

test('UTCID03: getWalletInfo preserves wallet status when a newly created wallet is returned', async () => {
  const { WalletService, state } = loadWalletService({
    walletFindOne: async () => null,
    walletCreate: async (data, _options, helperState) => ({
      id: 'wallet-3',
      user_id: data.user_id,
      balance: 0,
      locked_balance: 0,
      status: 'inactive',
      async save() {
        helperState.walletSaveCalls.push({ id: 'wallet-3' });
      },
    }),
  });

  const result = await WalletService.getWalletInfo('user-id');

  assert.equal(state.walletCreateCalls.length, 1);
  assert.equal(result.id, 'wallet-3');
  assert.equal(result.status, 'inactive');
  assert.equal(result.total_balance, 0);
});

test('UTCID04: getWalletInfo logs and rethrows database errors', async () => {
  const { WalletService, state } = loadWalletService({
    walletFindOne: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    WalletService.getWalletInfo('user-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 2);
  assert.equal(state.errorLogs[0][0], 'Get/create wallet error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
  assert.equal(state.errorLogs[1][0], 'Get wallet info error:');
  assert.equal(state.errorLogs[1][1].message, 'Database unavailable');
});
