const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createReportInstance } = require('./_reportTestHelper');

test('UTCID01: deleteMyReport cancels a pending active report owned by the requester', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-1',
      reporter_id: 'user-id',
      status: 'pending',
      is_active: true,
    }, state),
  });

  const result = await ReportService.deleteMyReport('report-1', 'user-id');

  assert.equal(state.reportUpdateCalls.length, 1);
  assert.deepEqual(state.reportUpdateCalls[0], {
    id: 'report-1',
    values: {
      status: 'cancelled',
      is_active: false,
    },
    options: undefined,
  });
  assert.equal(result.status, 'cancelled');
  assert.equal(result.is_active, false);
});

test('UTCID02: deleteMyReport returns the report unchanged when it is already cancelled or inactive', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-2',
      reporter_id: 'user-id',
      status: 'cancelled',
      is_active: false,
    }, state),
  });

  const result = await ReportService.deleteMyReport('report-2', 'user-id');

  assert.equal(state.reportUpdateCalls.length, 0);
  assert.equal(result.id, 'report-2');
  assert.equal(result.status, 'cancelled');
  assert.equal(result.is_active, false);
});

test('UTCID03: deleteMyReport throws when report does not exist', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => null,
  });

  await assert.rejects(
    ReportService.deleteMyReport('missing-report-id', 'user-id'),
    { message: 'Report not found' }
  );

  assert.equal(state.reportUpdateCalls.length, 0);
});

test('UTCID04: deleteMyReport throws when requester does not own the report', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-4',
      reporter_id: 'other-user-id',
      status: 'pending',
      is_active: true,
    }, state),
  });

  await assert.rejects(
    ReportService.deleteMyReport('report-4', 'user-id'),
    { message: 'You can only delete your own reports' }
  );

  assert.equal(state.reportUpdateCalls.length, 0);
});

test('UTCID05: deleteMyReport throws when the report has already been processed', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-5',
      reporter_id: 'user-id',
      status: 'resolved',
      is_active: true,
    }, state),
  });

  await assert.rejects(
    ReportService.deleteMyReport('report-5', 'user-id'),
    { message: 'Cannot delete processed reports' }
  );

  assert.equal(state.reportUpdateCalls.length, 0);
});
