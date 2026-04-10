const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'reportService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  NOTIFICATION_SERVICE: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
};

function setMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearModules() {
  Object.values(MODULES).forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

function createReportInstance(data, state, overrides = {}) {
  const record = {
    id: 'report-id',
    reporter_id: 'user-id',
    target_type: 'post',
    target_id: 'post-id',
    reason: 'spam',
    description: null,
    status: 'pending',
    is_active: true,
    created_at: new Date('2026-04-09T00:00:00.000Z'),
    updated_at: new Date('2026-04-09T00:00:00.000Z'),
    ...data,
    toJSON: () => ({
      ...record,
    }),
    update: async (values, options) => {
      state.reportUpdateCalls.push({ id: record.id, values, options });
      Object.assign(record, values);
      if (overrides.reportInstanceUpdate) {
        return overrides.reportInstanceUpdate(record, values, options, state);
      }
      return record;
    },
    save: async (options) => {
      state.reportSaveCalls.push({ id: record.id, options });
      if (overrides.reportInstanceSave) {
        return overrides.reportInstanceSave(record, options, state);
      }
      return record;
    },
  };

  return record;
}

function createTargetRecord(data, overrides = {}) {
  const record = {
    id: 'target-id',
    user_id: 'target-owner-id',
    privacy: 'public',
    content: 'Reported content',
    feedback: 'Reported review',
    title: 'Public Journal',
    status: 'published',
    is_active: true,
    ...data,
    update: async (values, options) => {
      if (overrides.instanceUpdate) {
        return overrides.instanceUpdate(record, values, options);
      }
      Object.assign(record, values);
      return record;
    },
    destroy: async (options) => {
      if (overrides.instanceDestroy) {
        return overrides.instanceDestroy(record, options);
      }
      record.destroyed = true;
      return record;
    },
  };

  return record;
}

function loadReportService(overrides = {}) {
  clearModules();

  const state = {
    reportFindOneCalls: [],
    reportCountCalls: [],
    reportCreateCalls: [],
    reportFindAndCountAllCalls: [],
    reportFindByPkCalls: [],
    reportUpdateCalls: [],
    reportSaveCalls: [],
    postFindByPkCalls: [],
    postCommentFindByPkCalls: [],
    journalFindByPkCalls: [],
    siteReviewFindByPkCalls: [],
    siteReviewUpdateCalls: [],

    notificationCalls: [],
    transactionCalls: [],
  };

  setMock(MODULES.MODELS, {
    Report: {
      findOne: async (options) => {
        state.reportFindOneCalls.push(options);
        if (overrides.reportFindOne) {
          return overrides.reportFindOne(options, state);
        }
        return null;
      },
      count: async (options) => {
        state.reportCountCalls.push(options);
        if (overrides.reportCount) {
          return overrides.reportCount(options, state);
        }
        return 0;
      },
      create: async (data, options) => {
        state.reportCreateCalls.push({ data, options });
        if (overrides.reportCreate) {
          return overrides.reportCreate(data, options, state);
        }
        return createReportInstance(data, state, overrides);
      },
      findAndCountAll: async (options) => {
        state.reportFindAndCountAllCalls.push(options);
        if (overrides.reportFindAndCountAll) {
          return overrides.reportFindAndCountAll(options, state);
        }
        return { rows: [], count: 0 };
      },
      findByPk: async (reportId, options) => {
        state.reportFindByPkCalls.push({ reportId, options });
        if (overrides.reportFindByPk) {
          return overrides.reportFindByPk(reportId, options, state);
        }
        return null;
      },
    },
    User: {},
    Post: {
      findByPk: async (targetId, options) => {
        state.postFindByPkCalls.push({ targetId, options });
        if (overrides.postFindByPk) {
          return overrides.postFindByPk(targetId, options, state);
        }
        return null;
      },
    },
    PostComment: {
      findByPk: async (targetId, options) => {
        state.postCommentFindByPkCalls.push({ targetId, options });
        if (overrides.postCommentFindByPk) {
          return overrides.postCommentFindByPk(targetId, options, state);
        }
        return null;
      },
    },
    Journal: {
      findByPk: async (targetId, options) => {
        state.journalFindByPkCalls.push({ targetId, options });
        if (overrides.journalFindByPk) {
          return overrides.journalFindByPk(targetId, options, state);
        }
        return null;
      },
    },
    SiteReview: {
      findByPk: async (targetId, options) => {
        state.siteReviewFindByPkCalls.push({ targetId, options });
        if (overrides.siteReviewFindByPk) {
          return overrides.siteReviewFindByPk(targetId, options, state);
        }
        return null;
      },
      update: async (values, options) => {
        state.siteReviewUpdateCalls.push({ values, options });
        if (overrides.siteReviewUpdate) {
          return overrides.siteReviewUpdate(values, options, state);
        }
        return [1];
      },
    },

    sequelize: {
      query: async (sql, options) => {
        state.queryCalls = state.queryCalls || [];
        state.queryCalls.push({ sql, options });
        if (overrides.query) {
          return overrides.query(sql, options, state);
        }
        return [{}, {}];
      },
      transaction: async (callback) => {
        state.transactionCalls.push(callback);
        if (overrides.transaction) {
          return overrides.transaction(callback, state);
        }
        if (typeof callback === 'function') {
          return callback({ id: 'transaction-id' });
        }
        return { id: 'transaction-id' };
      },
    },
  });

  setMock(MODULES.NOTIFICATION_SERVICE, {
    createNotification: async (...args) => {
      state.notificationCalls.push(args);
      if (overrides.createNotification) {
        return overrides.createNotification(...args, state);
      }
      return { id: 'notification-id' };
    },
  });

  const ReportService = require(MODULES.TARGET);

  return {
    ReportService,
    state,
    createReportInstance: (data) => createReportInstance(data, state, overrides),
    createTargetRecord,
  };
}

module.exports = {
  loadReportService,
  createReportInstance,
  createTargetRecord,
};
