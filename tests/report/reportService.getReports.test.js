const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createReportInstance } = require('./_reportTestHelper');

test('UTCID01: getReports returns all reports with reporter and resolver info by default', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createReportInstance({
          id: 'report-1',
          code: 'RPPO260409001',
          status: 'pending',
          target_type: 'post',
          reporter: { id: 'user-1', full_name: 'Pilgrim One' },
          resolver: null,
        }, state),
        createReportInstance({
          id: 'report-2',
          code: 'RPCM260409001',
          status: 'resolved',
          target_type: 'comment',
          reporter: { id: 'user-2', full_name: 'Pilgrim Two' },
          resolver: { id: 'admin-1', full_name: 'Admin One' },
        }, state),
      ],
    }),
  });

  const result = await ReportService.getReports({ page: 1, limit: 10 });
  const query = state.reportFindAndCountAllCalls[0];

  assert.deepEqual(query.where, {});
  assert.equal(query.include.length, 2);
  assert.equal(query.include[0].as, 'reporter');
  assert.equal(query.include[1].as, 'resolver');
  assert.deepEqual(query.order, [['created_at', 'DESC']]);
  assert.equal(query.limit, 10);
  assert.equal(query.offset, 0);
  assert.equal(result.reports.length, 2);
  assert.equal(result.pagination.current_page, 1);
  assert.equal(result.pagination.total_pages, 1);
  assert.equal(result.pagination.total_items, 2);
});

test('UTCID02: getReports applies status filter and second-page pagination correctly', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 2,
      rows: [
        createReportInstance({
          id: 'report-3',
          code: 'RPJN260409001',
          status: 'pending',
          target_type: 'journal',
        }, state),
      ],
    }),
  });

  const result = await ReportService.getReports({ status: 'pending', page: 2, limit: 1 });

  assert.deepEqual(state.reportFindAndCountAllCalls[0].where, { status: 'pending' });
  assert.equal(state.reportFindAndCountAllCalls[0].offset, 1);
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].status, 'pending');
  assert.equal(result.pagination.current_page, 2);
  assert.equal(result.pagination.total_pages, 2);
});

test('UTCID03: getReports applies target_type filter correctly', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 1,
      rows: [
        createReportInstance({
          id: 'report-4',
          code: 'RPSR260409001',
          status: 'resolved',
          target_type: 'site_review',
        }, state),
      ],
    }),
  });

  const result = await ReportService.getReports({ target_type: 'site_review', page: 1, limit: 10 });

  assert.deepEqual(state.reportFindAndCountAllCalls[0].where, { target_type: 'site_review' });
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].target_type, 'site_review');
});

test('UTCID04: getReports returns an empty list when no reports match filters', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => ({
      count: 0,
      rows: [],
    }),
  });

  const result = await ReportService.getReports({ status: 'resolved', target_type: 'journal', page: 1, limit: 10 });

  assert.deepEqual(state.reportFindAndCountAllCalls[0].where, {
    status: 'resolved',
    target_type: 'journal',
  });
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

test('UTCID05: getReports rethrows database errors from report lookup', async () => {
  const { ReportService, state } = loadReportService({
    reportFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    ReportService.getReports({ page: 1, limit: 10 }),
    { message: 'Database unavailable' }
  );

  assert.equal(state.reportFindAndCountAllCalls.length, 1);
});
