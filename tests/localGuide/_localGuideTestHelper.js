const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  SITE_TARGET: path.join(ROOT, 'services', 'localGuide', 'siteService.js'),
  MEDIA_TARGET: path.join(ROOT, 'services', 'localGuide', 'mediaService.js'),
  SCHEDULE_TARGET: path.join(ROOT, 'services', 'localGuide', 'scheduleService.js'),
  EVENT_TARGET: path.join(ROOT, 'services', 'localGuide', 'eventService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
  NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
};

function setMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearModules(targets) {
  targets.forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

function createMediaInstance(data, state, overrides = {}) {
  const record = {
    ...data,
    update: async (values, options) => {
      state.mediaInstanceUpdateCalls.push({ id: data.id, values, options });
      Object.assign(record, values);
      if (overrides.mediaInstanceUpdate) {
        return overrides.mediaInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };
  return record;
}

function loadLocalGuideSiteService(overrides = {}) {
  clearModules([MODULES.SITE_TARGET, MODULES.MODELS, MODULES.LOGGER]);

  const state = {
    userFindByPkCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    Site: {},
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  const LocalGuideSiteService = require(MODULES.SITE_TARGET);
  return { LocalGuideSiteService, state };
}

function loadLocalGuideMediaService(overrides = {}) {
  clearModules([MODULES.MEDIA_TARGET, MODULES.MODELS, MODULES.LOGGER, MODULES.NOTIFICATION]);

  const state = {
    userFindByPkCalls: [],
    siteMediaFindOneCalls: [],
    siteMediaCountCalls: [],
    siteMediaFindAllCalls: [],
    siteMediaCreateCalls: [],
    siteMediaStaticUpdateCalls: [],
    mediaInstanceUpdateCalls: [],
    notificationCalls: [],
    transactionCalls: 0,
    infoLogs: [],
    errorLogs: [],
  };

  const siteMediaModel = {
    findOne: async (options) => {
      state.siteMediaFindOneCalls.push(options);
      if (overrides.siteMediaFindOne) {
        return overrides.siteMediaFindOne(options, state);
      }
      return null;
    },
    count: async (options) => {
      state.siteMediaCountCalls.push(options);
      if (overrides.siteMediaCount) {
        return overrides.siteMediaCount(options, state);
      }
      return 0;
    },
    findAll: async (options) => {
      state.siteMediaFindAllCalls.push(options);
      if (overrides.siteMediaFindAll) {
        return overrides.siteMediaFindAll(options, state);
      }
      return [];
    },
    create: async (data) => {
      state.siteMediaCreateCalls.push(data);
      if (overrides.siteMediaCreate) {
        return overrides.siteMediaCreate(data, state);
      }
      return createMediaInstance(
        {
          id: 'media-id',
          site_id: data.site_id,
          code: data.code,
          url: data.url,
          type: data.type,
          caption: data.caption || null,
          status: data.status,
          rejection_reason: data.rejection_reason || null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: data.created_by,
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          updated_at: new Date('2026-03-26T00:00:00.000Z'),
        },
        state,
        overrides
      );
    },
    update: async (values, options) => {
      state.siteMediaStaticUpdateCalls.push({ values, options });
      if (overrides.siteMediaStaticUpdate) {
        return overrides.siteMediaStaticUpdate(values, options, state);
      }
      return [1];
    },
    sequelize: {
      transaction: async (callback) => {
        state.transactionCalls += 1;
        const transaction = { id: 'tx-1' };
        if (overrides.transaction) {
          return overrides.transaction(callback, transaction, state);
        }
        return callback(transaction);
      },
    },
  };

  setMock(MODULES.MODELS, {
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    SiteMedia: siteMediaModel,
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION, {
    notifySiteManager: async (...args) => {
      state.notificationCalls.push(args);
      if (overrides.notifySiteManager) {
        return overrides.notifySiteManager(args, state);
      }
      return undefined;
    },
  });

  const LocalGuideMediaService = require(MODULES.MEDIA_TARGET);
  return { LocalGuideMediaService, state, createMediaInstance: (data) => createMediaInstance(data, state, overrides) };
}

function createScheduleInstance(data, state, overrides = {}) {
  const record = {
    ...data,
    update: async (values, options) => {
      state.scheduleInstanceUpdateCalls.push({ id: data.id, values, options });
      Object.assign(record, values);
      if (overrides.scheduleInstanceUpdate) {
        return overrides.scheduleInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };
  return record;
}

function loadLocalGuideScheduleService(overrides = {}) {
  clearModules([MODULES.SCHEDULE_TARGET, MODULES.MODELS, MODULES.LOGGER, MODULES.NOTIFICATION]);

  const state = {
    userFindByPkCalls: [],
    siteFindByPkCalls: [],
    massScheduleFindOneCalls: [],
    massScheduleCountCalls: [],
    massScheduleFindAllCalls: [],
    massScheduleCreateCalls: [],
    scheduleInstanceUpdateCalls: [],
    notificationCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const massScheduleModel = {
    findOne: async (options) => {
      state.massScheduleFindOneCalls.push(options);
      if (overrides.massScheduleFindOne) {
        return overrides.massScheduleFindOne(options, state);
      }
      return null;
    },
    count: async (options) => {
      state.massScheduleCountCalls.push(options);
      if (overrides.massScheduleCount) {
        return overrides.massScheduleCount(options, state);
      }
      return 0;
    },
    findAll: async (options) => {
      state.massScheduleFindAllCalls.push(options);
      if (overrides.massScheduleFindAll) {
        return overrides.massScheduleFindAll(options, state);
      }
      return [];
    },
    create: async (data) => {
      state.massScheduleCreateCalls.push(data);
      if (overrides.massScheduleCreate) {
        return overrides.massScheduleCreate(data, state);
      }
      return createScheduleInstance(
        {
          id: 'schedule-id',
          site_id: data.site_id,
          code: data.code,
          days_of_week: data.days_of_week,
          time: data.time,
          note: data.note || null,
          status: data.status,
          rejection_reason: data.rejection_reason || null,
          reviewed_by: data.reviewed_by || null,
          reviewed_at: data.reviewed_at || null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: data.created_by,
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          updated_at: new Date('2026-03-26T00:00:00.000Z'),
        },
        state,
        overrides
      );
    },
  };

  setMock(MODULES.MODELS, {
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    Site: {
      findByPk: async (siteId, options) => {
        state.siteFindByPkCalls.push({ siteId, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(siteId, options, state);
        }
        return {
          id: siteId,
          opening_hours: null,
        };
      },
    },
    MassSchedule: massScheduleModel,
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION, {
    notifySiteManager: async (...args) => {
      state.notificationCalls.push(args);
      if (overrides.notifySiteManager) {
        return overrides.notifySiteManager(args, state);
      }
      return undefined;
    },
  });

  const LocalGuideScheduleService = require(MODULES.SCHEDULE_TARGET);
  return {
    LocalGuideScheduleService,
    state,
    createScheduleInstance: (data) => createScheduleInstance(data, state, overrides),
  };
}

function createEventInstance(data, state, overrides = {}) {
  const record = {
    ...data,
    update: async (values, options) => {
      state.eventInstanceUpdateCalls.push({ id: data.id, values, options });
      Object.assign(record, values);
      if (overrides.eventInstanceUpdate) {
        return overrides.eventInstanceUpdate(record, values, options, state);
      }
      return record;
    },
  };
  return record;
}

function loadLocalGuideEventService(overrides = {}) {
  clearModules([MODULES.EVENT_TARGET, MODULES.MODELS, MODULES.LOGGER, MODULES.NOTIFICATION]);

  const state = {
    userFindByPkCalls: [],
    eventFindOneCalls: [],
    eventCountCalls: [],
    eventFindAllCalls: [],
    eventCreateCalls: [],
    eventInstanceUpdateCalls: [],
    notificationCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const eventModel = {
    findOne: async (options) => {
      state.eventFindOneCalls.push(options);
      if (overrides.eventFindOne) {
        return overrides.eventFindOne(options, state);
      }
      return null;
    },
    count: async (options) => {
      state.eventCountCalls.push(options);
      if (overrides.eventCount) {
        return overrides.eventCount(options, state);
      }
      return 0;
    },
    findAll: async (options) => {
      state.eventFindAllCalls.push(options);
      if (overrides.eventFindAll) {
        return overrides.eventFindAll(options, state);
      }
      return [];
    },
    create: async (data) => {
      state.eventCreateCalls.push(data);
      if (overrides.eventCreate) {
        return overrides.eventCreate(data, state);
      }
      return createEventInstance(
        {
          id: 'event-id',
          site_id: data.site_id,
          code: data.code,
          name: data.name,
          description: data.description || null,
          start_date: data.start_date,
          end_date: data.end_date || null,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          location: data.location || null,
          category: data.category || null,
          banner_url: data.banner_url || null,
          status: data.status,
          time_state: data.time_state || 'upcoming',
          rejection_reason: data.rejection_reason || null,
          reviewed_by: data.reviewed_by || null,
          reviewed_at: data.reviewed_at || null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: data.created_by,
          created_at: new Date('2026-04-07T00:00:00.000Z'),
          updated_at: new Date('2026-04-07T00:00:00.000Z'),
        },
        state,
        overrides
      );
    },
  };

  setMock(MODULES.MODELS, {
    User: {
      findByPk: async (userId, options) => {
        state.userFindByPkCalls.push({ userId, options });
        if (overrides.userFindByPk) {
          return overrides.userFindByPk(userId, options, state);
        }
        return null;
      },
    },
    Event: eventModel,
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  setMock(MODULES.NOTIFICATION, {
    notifySiteManager: async (...args) => {
      state.notificationCalls.push(args);
      if (overrides.notifySiteManager) {
        return overrides.notifySiteManager(args, state);
      }
      return undefined;
    },
  });

  const LocalGuideEventService = require(MODULES.EVENT_TARGET);
  return {
    LocalGuideEventService,
    state,
    createEventInstance: (data) => createEventInstance(data, state, overrides),
  };
}

module.exports = {
  loadLocalGuideSiteService,
  loadLocalGuideMediaService,
  loadLocalGuideScheduleService,
  loadLocalGuideEventService,
};
