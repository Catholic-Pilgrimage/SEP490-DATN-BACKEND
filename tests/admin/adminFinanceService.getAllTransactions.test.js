const test = require('node:test');
const assert = require('node:assert/strict');

const { Op } = require('sequelize');

const {
  loadAdminFinanceService,
  createTransactionRecord,
} = require('./_financeTestHelper');

test('UTCID01: getAllTransactions returns transactions with default pagination and wallet-user metadata', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindAndCountAll: async () => ({
      count: 1,
      rows: [
        createTransactionRecord({
          id: 'txn-1',
          type: 'topup',
          status: 'completed',
        }),
      ],
    }),
  });

  const result = await AdminFinanceService.getAllTransactions();

  assert.deepEqual(state.transactionFindAndCountAllCalls[0].where, {});
  assert.equal(state.transactionFindAndCountAllCalls[0].limit, 20);
  assert.equal(state.transactionFindAndCountAllCalls[0].offset, 0);
  assert.deepEqual(state.transactionFindAndCountAllCalls[0].order, [['created_at', 'DESC']]);
  assert.equal(state.transactionFindAndCountAllCalls[0].include[0].as, 'wallet');
  assert.equal(state.transactionFindAndCountAllCalls[0].include[0].include[0].as, 'user');
  assert.equal(result.transactions.length, 1);
  assert.equal(result.transactions[0].wallet.user.full_name, 'Pilgrim User');
  assert.deepEqual(result, {
    transactions: result.transactions,
    total: 1,
    totalPages: 1,
    currentPage: 1,
  });
});

test('UTCID02: getAllTransactions applies type, status, reference_type, planner_id, date range, search, and second-page pagination', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createTransactionRecord({
          id: 'txn-2',
          type: 'escrow_lock',
          status: 'completed',
          reference_type: 'planner_deposit',
          reference_id: 'planner-1:user-1:123456',
        }),
      ],
    }),
  });

  const result = await AdminFinanceService.getAllTransactions({
    type: 'escrow_lock',
    status: 'completed',
    reference_type: 'planner_deposit',
    planner_id: 'planner-1',
    date_from: '2026-04-01',
    date_to: '2026-04-10',
    search: 'Pilgrim',
    page: '2',
    limit: '1',
  });

  const where = state.transactionFindAndCountAllCalls[0].where;
  assert.equal(where.type, 'escrow_lock');
  assert.equal(where.status, 'completed');
  assert.equal(where.reference_type, 'planner_deposit');
  assert.deepEqual(where[Op.or], [
    { reference_type: 'planner', reference_id: 'planner-1' },
    { reference_type: 'planner_deposit', reference_id: { [Op.like]: 'planner-1:%' } },
    { reference_type: 'planner_penalty', reference_id: { [Op.like]: 'planner-1:%' } },
  ]);
  assert.ok(where.created_at[Op.gte] instanceof Date);
  assert.ok(where.created_at[Op.lte] instanceof Date);
  assert.equal(state.transactionFindAndCountAllCalls[0].include[0].include[0].where[Op.or].length, 2);
  assert.equal(state.transactionFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.transactionFindAndCountAllCalls[0].offset, 1);
  assert.equal(result.totalPages, 2);
  assert.equal(result.currentPage, 2);
});

test('UTCID03: getAllTransactions falls back to default pagination when page and limit are invalid', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindAndCountAll: async () => ({
      count: 3,
      rows: [
        createTransactionRecord({ id: 'txn-3' }),
        createTransactionRecord({ id: 'txn-4' }),
        createTransactionRecord({ id: 'txn-5' }),
      ],
    }),
  });

  const result = await AdminFinanceService.getAllTransactions({
    page: 'abc',
    limit: 'xyz',
  });

  assert.equal(state.transactionFindAndCountAllCalls[0].limit, 20);
  assert.equal(state.transactionFindAndCountAllCalls[0].offset, 0);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
});

test('UTCID04: getAllTransactions returns an empty list when no transaction matches filters', async () => {
  const { AdminFinanceService } = loadAdminFinanceService({
    transactionFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await AdminFinanceService.getAllTransactions({
    status: 'failed',
  });

  assert.deepEqual(result, {
    transactions: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });
});

test('UTCID05: getAllTransactions logs and rethrows database errors', async () => {
  const { AdminFinanceService, state } = loadAdminFinanceService({
    transactionFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    AdminFinanceService.getAllTransactions(),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Admin getAllTransactions error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
