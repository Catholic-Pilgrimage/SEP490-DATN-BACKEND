const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createReportInstance } = require('./_reportTestHelper');

test('UTCID01: getMyReports returns active reports by default with pagination metadata', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createReportInstance({
          id: 'report-1',
          code: 'RPPO260409001',
          is_active: true,
          status: 'pending',
        }, state),
        createReportInstance({
          id: 'report-2',
          code: 'RPCM260409001',
          is_active: true,
          status: 'resolved',
        }, state),
      ],
    }),
  });

  const result = await ReportService.getMyReports('user-id', { page: 1, limit: 10 });

  assert.deepEqual(state.reportFindAndCountAllCalls[0], {
    where: { reporter_id: 'user-id' },
    order: [['created_at', 'DESC']],
    limit: 10,
    offset: 0,
  });
  assert.equal(result.reports.length, 2);
  assert.equal(result.pagination.current_page, 1);
  assert.equal(result.pagination.total_pages, 1);
  assert.equal(result.pagination.total_items, 2);
  assert.equal(result.pagination.limit, 10);
});

test('UTCID02: getMyReports applies inactive filter and second-page pagination correctly', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createReportInstance({
          id: 'report-3',
          code: 'RPJN260409001',
          is_active: false,
          status: 'cancelled',
        }, state),
      ],
    }),
  });

  const result = await ReportService.getMyReports('user-id', { page: 2, limit: 1, is_active: false });

  assert.deepEqual(state.reportFindAndCountAllCalls[0], {
    where: { reporter_id: 'user-id', is_active: false },
    order: [['created_at', 'DESC']],
    limit: 1,
    offset: 1,
  });
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].is_active, false);
  assert.equal(result.pagination.current_page, 2);
  assert.equal(result.pagination.total_pages, 2);
});

test('UTCID03: getMyReports treats is_active = all as no active filter and returns mixed reports', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createReportInstance({
          id: 'report-4',
          code: 'RPSR260409001',
          is_active: true,
          status: 'resolved',
        }, state),
        createReportInstance({
          id: 'report-5',
          code: 'RPNR260409001',
          is_active: false,
          status: 'cancelled',
        }, state),
      ],
    }),
  });

  const result = await ReportService.getMyReports('user-id', { page: 1, limit: 10, is_active: 'all' });

  assert.deepEqual(state.reportFindAndCountAllCalls[0], {
    where: { reporter_id: 'user-id' },
    order: [['created_at', 'DESC']],
    limit: 10,
    offset: 0,
  });
  assert.equal(result.reports.length, 2);
  assert.equal(result.reports[0].is_active, true);
  assert.equal(result.reports[1].is_active, false);
});

test('UTCID04: getMyReports returns an empty list when the user has no reports', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await ReportService.getMyReports('user-id', { page: 1, limit: 10 });

  assert.equal(state.reportFindAndCountAllCalls.length, 1);
  assert.deepEqual(result, {
    reports: [],
    pagination: {
      current_page: 1,
      total_pages: 0,
      total_items: 0,
      limit: 10,
    },
  });
});

test('UTCID05: getMyReports rethrows database errors from report lookup', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    ReportService.getMyReports('user-id', { page: 1, limit: 10 }),
    { message: 'Database unavailable' }
  );

  assert.equal(state.reportFindAndCountAllCalls.length, 1);
});
