const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createReportInstance, createTargetRecord } = require('./_reportTestHelper');

test('UTCID01: getReportById returns post report detail with target post content', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-1',
      code: 'RPPO260409001',
      target_type: 'post',
      target_id: 'post-1',
      reporter: { id: 'user-1', full_name: 'Pilgrim One' },
      resolver: null,
    }, state),
    postFindByPk: async () => createTargetRecord({
      id: 'post-1',
      user_id: 'post-owner-id',
      content: 'Reported post content',
      author: { id: 'post-owner-id', full_name: 'Author One' },
    }),
  });

  const result = await ReportService.getReportById('report-1');

  assert.equal(state.reportFindByPkCalls.length, 1);
  assert.equal(state.reportFindByPkCalls[0].reportId, 'report-1');
  assert.equal(state.reportFindByPkCalls[0].options.include[0].as, 'reporter');
  assert.equal(state.reportFindByPkCalls[0].options.include[1].as, 'resolver');
  assert.equal(state.postFindByPkCalls[0].targetId, 'post-1');
  assert.equal(state.postFindByPkCalls[0].options.include[0].as, 'author');
  assert.equal(result.id, 'report-1');
  assert.equal(result.target_content.id, 'post-1');
  assert.equal(result.target_content.content, 'Reported post content');
});

test('UTCID02: getReportById returns comment report detail with target comment content', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-2',
      code: 'RPCM260409001',
      target_type: 'comment',
      target_id: 'comment-1',
    }, state),
    postCommentFindByPk: async () => createTargetRecord({
      id: 'comment-1',
      user_id: 'comment-owner-id',
      content: 'Reported comment content',
      author: { id: 'comment-owner-id', full_name: 'Commenter One' },
    }),
  });

  const result = await ReportService.getReportById('report-2');

  assert.equal(state.postCommentFindByPkCalls[0].targetId, 'comment-1');
  assert.equal(state.postCommentFindByPkCalls[0].options.include[0].as, 'author');
  assert.equal(result.target_content.id, 'comment-1');
  assert.equal(result.target_content.content, 'Reported comment content');
});

test('UTCID03: getReportById returns journal report detail with target journal content', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-3',
      code: 'RPJN260409001',
      target_type: 'journal',
      target_id: 'journal-1',
    }, state),
    journalFindByPk: async () => createTargetRecord({
      id: 'journal-1',
      user_id: 'journal-owner-id',
      title: 'Shared Journal',
      privacy: 'public',
      author: { id: 'journal-owner-id', full_name: 'Journal Owner' },
    }),
  });

  const result = await ReportService.getReportById('report-3');

  assert.equal(state.journalFindByPkCalls[0].targetId, 'journal-1');
  assert.equal(state.journalFindByPkCalls[0].options.include[0].as, 'author');
  assert.equal(result.target_content.id, 'journal-1');
  assert.equal(result.target_content.title, 'Shared Journal');
});

test('UTCID04: getReportById returns site review report detail with reviewer info', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-4',
      code: 'RPSR260409001',
      target_type: 'site_review',
      target_id: 'site-review-1',
    }, state),
    siteReviewFindByPk: async () => createTargetRecord({
      id: 'site-review-1',
      user_id: 'reviewer-id',
      feedback: 'Reported site review',
      reviewer: { id: 'reviewer-id', full_name: 'Reviewer One' },
    }),
  });

  const result = await ReportService.getReportById('report-4');

  assert.equal(state.siteReviewFindByPkCalls[0].targetId, 'site-review-1');
  assert.equal(state.siteReviewFindByPkCalls[0].options.include[0].as, 'reviewer');
  assert.equal(result.target_content.id, 'site-review-1');
  assert.equal(result.target_content.feedback, 'Reported site review');
});

test('UTCID05: getReportById returns site review report detail and preserves null target when content is missing', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-5',
      code: 'RPSR260409002',
      target_type: 'site_review',
      target_id: 'site-review-99',
    }, state),
    siteReviewFindByPk: async () => null,
  });

  const result = await ReportService.getReportById('report-5');

  assert.equal(state.siteReviewFindByPkCalls[0].targetId, 'site-review-99');
  assert.equal(state.siteReviewFindByPkCalls[0].options.include[0].as, 'reviewer');
  assert.equal(result.id, 'report-5');
  assert.equal(result.target_content, null);
});

test('UTCID06: getReportById throws when the report does not exist', async () => {
  const { ReportService, state } = loadReportService({
    reportFindByPk: async () => null,
  });

  await assert.rejects(
    ReportService.getReportById('missing-report-id'),
    { message: 'Report not found' }
  );

  assert.equal(state.postFindByPkCalls.length, 0);
  assert.equal(state.postCommentFindByPkCalls.length, 0);
  assert.equal(state.journalFindByPkCalls.length, 0);
});

test('UTCID07: getReportById propagates target-content loading errors', async () => {
  const { ReportService } = loadReportService({
    reportFindByPk: async () => createReportInstance({
      id: 'report-7',
      code: 'RPPO260409007',
      target_type: 'post',
      target_id: 'post-7',
    }),
    postFindByPk: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    ReportService.getReportById('report-7'),
    { message: 'Database unavailable' }
  );
});
