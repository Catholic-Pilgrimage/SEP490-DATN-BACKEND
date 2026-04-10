const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createReportInstance, createTargetRecord } = require('./_reportTestHelper');

test('UTCID01: resolveReport resolves a post report, hides content, and notifies the target user', async () => {
  let helperState;
  const postUpdateCalls = [];

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-1',
      status: 'pending',
      target_type: 'post',
      target_id: 'post-1',
    }, helperState),
    postFindByPk: async () => createTargetRecord({
      id: 'post-1',
      user_id: 'post-owner-id',
      content: 'Reported post content that should be hidden by admin',
    }, {
      instanceUpdate: async (record, values, options) => {
        postUpdateCalls.push({ values, options });
        Object.assign(record, values);
        return record;
      },
    }),
  });
  helperState = state;

  const result = await ReportService.resolveReport('report-1', 'admin-id', {
    action: 'resolved',
    note: 'Spam confirmed',
    penalty: 'delete_content',
  });

  assert.equal(state.transactionCalls.length, 1);
  assert.equal(postUpdateCalls.length, 1);
  assert.deepEqual(postUpdateCalls[0].values, { is_active: false });
  assert.ok(postUpdateCalls[0].options.transaction);
  assert.equal(state.reportSaveCalls.length, 1);
  assert.ok(state.reportSaveCalls[0].options.transaction);
  assert.equal(result.status, 'resolved');
  assert.equal(result.resolved_by, 'admin-id');
  assert.equal(result.admin_note, 'Spam confirmed');
  assert.equal(state.notificationCalls.length, 1);
  assert.equal(state.notificationCalls[0][0], 'content_deleted');
  assert.equal(state.notificationCalls[0][1], 'post-owner-id');
  assert.ok(state.notificationCalls[0][2].adminNote.includes('Spam confirmed'));
});

test('UTCID02: resolveReport resolves a comment report with warning penalty and keeps content visible', async () => {
  let helperState;
  const commentUpdateCalls = [];

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-2',
      status: 'pending',
      target_type: 'comment',
      target_id: 'comment-1',
    }, helperState),
    postCommentFindByPk: async () => createTargetRecord({
      id: 'comment-1',
      user_id: 'comment-owner-id',
      content: 'Comment that receives warning only',
    }, {
      instanceUpdate: async (record, values, options) => {
        commentUpdateCalls.push({ values, options });
        Object.assign(record, values);
        return record;
      },
    }),
  });
  helperState = state;

  const result = await ReportService.resolveReport('report-2', 'admin-id', {
    action: 'resolved',
    note: 'Please be respectful',
    penalty: 'warning',
  });

  assert.equal(commentUpdateCalls.length, 1);
  assert.deepEqual(commentUpdateCalls[0].values, { status: 'rejected' });
  assert.equal(state.reportSaveCalls.length, 1);
  assert.equal(result.status, 'resolved');
  assert.equal(state.notificationCalls.length, 1);
  assert.equal(state.notificationCalls[0][0], 'content_deleted');
  assert.equal(state.notificationCalls[0][1], 'comment-owner-id');
  assert.ok(state.notificationCalls[0][2].adminNote.includes('Please be respectful'));
});

test('UTCID03: resolveReport resolves a journal report and destroys journal content when delete_content is applied', async () => {
  let helperState;
  const destroyCalls = [];

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-3',
      status: 'pending',
      target_type: 'journal',
      target_id: 'journal-1',
    }, helperState),
    journalFindByPk: async () => createTargetRecord({
      id: 'journal-1',
      user_id: 'journal-owner-id',
      title: 'Shared Journal',
    }, {
      instanceDestroy: async (record, options) => {
        destroyCalls.push({ options });
        record.destroyed = true;
        return record;
      },
    }),
  });
  helperState = state;

  const result = await ReportService.resolveReport('report-3', 'admin-id', {
    action: 'resolved',
    note: 'Sensitive content',
    penalty: 'delete_content',
  });

  assert.equal(destroyCalls.length, 1);
  assert.ok(destroyCalls[0].options.transaction);
  assert.equal(state.reportSaveCalls.length, 1);
  assert.equal(result.status, 'resolved');
  assert.equal(state.notificationCalls.length, 1);
  assert.equal(state.notificationCalls[0][0], 'content_deleted');
  assert.equal(state.notificationCalls[0][1], 'journal-owner-id');
});

test('UTCID04: resolveReport resolves a site review report and hides the review', async () => {
  let helperState;

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-4',
      status: 'pending',
      target_type: 'site_review',
      target_id: 'site-review-1',
    }, helperState),
    siteReviewFindByPk: async () => createTargetRecord({
      id: 'site-review-1',
      user_id: 'review-owner-id',
      feedback: 'Inappropriate review text',
    }),
  });
  helperState = state;

  const result = await ReportService.resolveReport('report-4', 'admin-id', {
    action: 'resolved',
    note: 'Review removed',
    penalty: 'warning',
  });

  assert.equal(state.siteReviewUpdateCalls.length, 1);
  assert.deepEqual(state.siteReviewUpdateCalls[0].values, { is_active: false });
  assert.deepEqual(state.siteReviewUpdateCalls[0].options.where, { id: 'site-review-1' });
  assert.ok(state.siteReviewUpdateCalls[0].options.transaction);
  assert.equal(state.notificationCalls.length, 1);
  assert.equal(state.notificationCalls[0][0], 'content_deleted');
  assert.equal(state.notificationCalls[0][1], 'review-owner-id');
  assert.equal(result.status, 'resolved');
});

test('UTCID05: resolveReport saves a reject action without touching target content or sending notifications', async () => {
  let helperState;

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-5',
      status: 'pending',
      target_type: 'post',
      target_id: 'post-5',
    }, helperState),
  });
  helperState = state;

  const result = await ReportService.resolveReport('report-5', 'admin-id', {
    action: 'reject',
    note: 'False positive',
    penalty: 'warning',
  });

  assert.equal(state.postFindByPkCalls.length, 0);
  assert.equal(state.postCommentFindByPkCalls.length, 0);
  assert.equal(state.journalFindByPkCalls.length, 0);
  assert.equal(state.siteReviewFindByPkCalls.length, 0);

  assert.equal(state.notificationCalls.length, 0);
  assert.equal(state.reportSaveCalls.length, 1);
  assert.equal(result.status, 'reject');
  assert.equal(result.admin_note, 'False positive');
});

test('UTCID06: resolveReport throws when report does not exist', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => null,
  });

  await assert.rejects(
    ReportService.resolveReport('missing-report-id', 'admin-id', {
      action: 'resolved',
      note: 'Missing',
      penalty: 'warning',
    }),
    { message: 'Report not found' }
  );

  assert.equal(state.transactionCalls.length, 0);
  assert.equal(state.notificationCalls.length, 0);
});

test('UTCID07: resolveReport throws when the report has already been processed', async () => {
  let helperState;

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-7',
      status: 'resolved',
      target_type: 'post',
      target_id: 'post-7',
    }, helperState),
  });
  helperState = state;

  await assert.rejects(
    ReportService.resolveReport('report-7', 'admin-id', {
      action: 'resolved',
      note: 'Already handled',
      penalty: 'warning',
    }),
    { message: 'Report has already been processed' }
  );

  assert.equal(state.transactionCalls.length, 0);
  assert.equal(state.notificationCalls.length, 0);
});

test('UTCID08: resolveReport propagates database errors during transactional save and skips notifications', async () => {
  let helperState;

  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-8',
      status: 'pending',
      target_type: 'site_review',
      target_id: 'site-review-8',
    }, helperState, {
      reportInstanceSave: async () => {
        throw new Error('Database unavailable');
      },
    }),
    siteReviewFindByPk: async () => createTargetRecord({
      id: 'site-review-8',
      user_id: 'review-owner-id',
      feedback: 'Reported site review',
    }),
  });
  helperState = state;

  await assert.rejects(
    ReportService.resolveReport('report-8', 'admin-id', {
      action: 'resolved',
      note: 'Escalated',
      penalty: 'warning',
    }),
    { message: 'Database unavailable' }
  );

  assert.equal(state.siteReviewUpdateCalls.length, 1);
  assert.equal(state.notificationCalls.length, 0);
});
