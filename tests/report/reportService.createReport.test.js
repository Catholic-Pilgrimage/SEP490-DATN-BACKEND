const test = require('node:test');
const assert = require('node:assert/strict');

const { loadReportService, createTargetRecord } = require('./_reportTestHelper');

const RealDate = Date;

function freezeDate(isoString) {
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate(isoString);
      }
      return new RealDate(...args);
    }

    static now() {
      return new RealDate(isoString).getTime();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };
}

function restoreDate() {
  global.Date = RealDate;
}

test('UTCID01: createReport creates a new post report successfully with generated code', async () => {
  freezeDate('2026-04-09T08:00:00.000Z');
  try {
    const { ReportService, state } = loadReportService({
      postFindByPk: async () => createTargetRecord({
        id: 'post-1',
        user_id: 'post-owner-id',
        content: 'Community content',
      }),
    });

    const result = await ReportService.createReport('user-id', {
      target_type: 'post',
      target_id: 'post-1',
      reason: 'spam',
      description: 'Contains spam links',
    });

    assert.equal(state.reportCreateCalls.length, 1);
    assert.deepEqual(state.reportCreateCalls[0].data, {
      reporter_id: 'user-id',
      target_type: 'post',
      target_id: 'post-1',
      reason: 'spam',
      description: 'Contains spam links',
      code: 'RPPO260409001',
    });
    assert.equal(result.code, 'RPPO260409001');
    assert.equal(result.target_type, 'post');
  } finally {
    restoreDate();
  }
});


test('UTCID03: createReport rejects invalid target type', async () => {
  const { ReportService, state } = loadReportService();

  await assert.rejects(
    ReportService.createReport('user-id', {
      target_type: 'message',
      target_id: 'msg-1',
      reason: 'spam',
      description: 'Unsupported target',
    }),
    (error) => {
      assert.equal(error.message, 'Invalid target type');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.reportFindOneCalls.length, 0);
  assert.equal(state.reportCreateCalls.length, 0);
});

test('UTCID04: createReport throws when target post does not exist', async () => {
  const { ReportService, state } = loadReportService({
    postFindByPk: async () => null,
  });

  await assert.rejects(
    ReportService.createReport('user-id', {
      target_type: 'post',
      target_id: 'missing-post-id',
      reason: 'spam',
      description: 'Missing content',
    }),
    (error) => {
      assert.equal(error.message, 'Post not found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(state.reportFindOneCalls.length, 0);
  assert.equal(state.reportCreateCalls.length, 0);
});

test('UTCID05: createReport rejects reporting the user’s own post', async () => {
  const { ReportService, state } = loadReportService({
    postFindByPk: async () => createTargetRecord({
      id: 'post-own',
      user_id: 'user-id',
      content: 'My own post',
    }),
  });

  await assert.rejects(
    ReportService.createReport('user-id', {
      target_type: 'post',
      target_id: 'post-own',
      reason: 'other',
      description: 'Self report',
    }),
    (error) => {
      assert.equal(error.message, 'Cannot report your own post');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.reportFindOneCalls.length, 0);
  assert.equal(state.reportCreateCalls.length, 0);
});

test('UTCID06: createReport rejects reporting a non-public journal', async () => {
  const { ReportService, state } = loadReportService({
    journalFindByPk: async () => createTargetRecord({
      id: 'journal-1',
      user_id: 'journal-owner-id',
      privacy: 'private',
      title: 'Private Journal',
    }),
  });

  await assert.rejects(
    ReportService.createReport('user-id', {
      target_type: 'journal',
      target_id: 'journal-1',
      reason: 'inappropriate',
      description: 'Private journal should not be reportable',
    }),
    (error) => {
      assert.equal(error.message, 'Can only report public journals');
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(state.reportFindOneCalls.length, 0);
  assert.equal(state.reportCreateCalls.length, 0);
});

test('UTCID07: createReport rejects duplicate pending active reports from the same user', async () => {
  const { ReportService, state } = loadReportService({
    siteReviewFindByPk: async () => createTargetRecord({
      id: 'site-review-1',
      user_id: 'review-owner-id',
      feedback: 'Site review',
    }),
    reportFindOne: async () => ({
      id: 'report-existing',
      reporter_id: 'user-id',
      target_type: 'site_review',
      target_id: 'site-review-1',
      status: 'pending',
      is_active: true,
    }),
  });

  await assert.rejects(
    ReportService.createReport('user-id', {
      target_type: 'site_review',
      target_id: 'site-review-1',
      reason: 'spam',
      description: 'Duplicate report',
    }),
    (error) => {
      assert.equal(error.message, 'You have already reported this content');
      assert.equal(error.statusCode, 409);
      return true;
    }
  );

  assert.equal(state.reportFindOneCalls.length, 1);
  assert.equal(state.reportCreateCalls.length, 0);
});
