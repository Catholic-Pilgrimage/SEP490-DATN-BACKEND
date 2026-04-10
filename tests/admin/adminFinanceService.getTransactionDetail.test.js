const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadAdminFinanceService,
  createTransactionRecord,
} = require('./_financeTestHelper');

test('UTCID01: getTransactionDetail returns transaction detail with parsed amount and bank_info JSON string', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindByPk: async () => ({
      ...createTransactionRecord({
        id: 'txn-1',
        amount: '150000.75',
        bank_info: '{"bank_code":"VCB","account_number":"123456789"}',
      }),
      toJSON() {
        return {
          ...this,
        };
      },
    }),
  });

  const result = await AdminFinanceService.getTransactionDetail('txn-1');

  assert.equal(state.transactionFindByPkCalls.length, 1);
  assert.equal(state.transactionFindByPkCalls[0].id, 'txn-1');
  assert.equal(state.transactionFindByPkCalls[0].options.include[0].as, 'wallet');
  assert.equal(state.transactionFindByPkCalls[0].options.include[0].include[0].as, 'user');
  assert.equal(result.amount, 150000.75);
  assert.deepEqual(result.bank_info, {
    bank_code: 'VCB',
    account_number: '123456789',
  });
  assert.equal(result.wallet.user.full_name, 'Pilgrim User');
});

test('UTCID02: getTransactionDetail preserves bank_info object when it is already parsed', async () => {
  const { AdminFinanceService } = loadAdminFinanceService({
    transactionFindByPk: async () => ({
      ...createTransactionRecord({
        id: 'txn-2',
        amount: '300000',
        bank_info: {
          bank_code: 'ACB',
          account_name: 'User Two',
        },
      }),
      toJSON() {
        return {
          ...this,
        };
      },
    }),
  });

  const result = await AdminFinanceService.getTransactionDetail('txn-2');

  assert.equal(result.amount, 300000);
  assert.deepEqual(result.bank_info, {
    bank_code: 'ACB',
    account_name: 'User Two',
  });
});

test('UTCID03: getTransactionDetail returns null bank_info when stored JSON is malformed', async () => {
  const { AdminFinanceService } = loadAdminFinanceService({
    transactionFindByPk: async () => ({
      ...createTransactionRecord({
        id: 'txn-3',
        amount: '45000',
        bank_info: '{invalid-json}',
      }),
      toJSON() {
        return {
          ...this,
        };
      },
    }),
  });

  const result = await AdminFinanceService.getTransactionDetail('txn-3');

  assert.equal(result.amount, 45000);
  assert.equal(result.bank_info, null);
});

test('UTCID04: getTransactionDetail throws when the transaction does not exist', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindByPk: async () => null,
  });

  await assert.rejects(
    AdminFinanceService.getTransactionDetail('missing-txn'),
    { message: 'Transaction not found' }
  );

  assert.equal(state.transactionFindByPkCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Admin getTransactionDetail error:');
});

test('UTCID05: getTransactionDetail logs and rethrows database errors', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindByPk: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    AdminFinanceService.getTransactionDetail('txn-5'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Admin getTransactionDetail error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
