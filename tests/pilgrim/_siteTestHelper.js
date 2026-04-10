const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
  TARGET: path.join(ROOT, 'services', 'pilgrim', 'siteService.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
  DB: path.join(ROOT, 'config', 'database.js'),
  LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
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

function createSiteRecord(data) {
  return {
    id: 'site-id',
    code: 'SITE001',
    name: 'La Vang Shrine',
    description: 'Pilgrimage site',
    address: 'Hue',
    province: 'Hue',
    district: 'Hai Lang',
    region: 'Central',
    type: 'shrine',
    patron_saint: 'Our Lady of La Vang',
    cover_image: 'https://cdn.example.com/site.jpg',
    opening_hours: '06:00-20:00',
    latitude: 16.7401,
    longitude: 107.2302,
    ...data,
  };
}

function createFavoriteRecord(data, state, overrides = {}) {
  const record = {
    user_id: 'user-id',
    site_id: 'site-id',
    created_at: new Date('2026-04-10T00:00:00.000Z'),
    ...data,
    destroy: async () => {
      state.userFavoriteDestroyCalls.push({
        user_id: record.user_id,
        site_id: record.site_id,
      });
      if (overrides.userFavoriteDestroy) {
        return overrides.userFavoriteDestroy(record, state);
      }
      return undefined;
    },
  };

  return record;
}

function loadPilgrimSiteService(overrides = {}) {
  clearModules();

  const state = {
    siteFindAndCountAllCalls: [],
    siteFindOneCalls: [],
    siteFindByPkCalls: [],
    userFavoriteFindOneCalls: [],
    userFavoriteCreateCalls: [],
    userFavoriteDestroyCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  setMock(MODULES.MODELS, {
    Site: {
      findAndCountAll: async (options) => {
        state.siteFindAndCountAllCalls.push(options);
        if (overrides.siteFindAndCountAll) {
          return overrides.siteFindAndCountAll(options, state);
        }
        return { count: 0, rows: [] };
      },
      findOne: async (options) => {
        state.siteFindOneCalls.push(options);
        if (overrides.siteFindOne) {
          return overrides.siteFindOne(options, state);
        }
        return null;
      },
      findByPk: async (siteId, options) => {
        state.siteFindByPkCalls.push({ siteId, options });
        if (overrides.siteFindByPk) {
          return overrides.siteFindByPk(siteId, options, state);
        }
        return null;
      },
    },
    User: {},
    UserFavorite: {
      findOne: async (options) => {
        state.userFavoriteFindOneCalls.push(options);
        if (overrides.userFavoriteFindOne) {
          return overrides.userFavoriteFindOne(options, state);
        }
        return null;
      },
      create: async (data) => {
        state.userFavoriteCreateCalls.push(data);
        if (overrides.userFavoriteCreate) {
          return overrides.userFavoriteCreate(data, state);
        }
        return data;
      },
    },
    SiteMedia: {},
    MassSchedule: {},
    Event: {},
    NearbyPlace: {},
    VerificationRequest: {},
  });

  setMock(MODULES.DB, {
    literal: (sql) => ({ __literal: sql }),
  });

  setMock(MODULES.LOGGER, {
    info: (...args) => state.infoLogs.push(args),
    error: (...args) => state.errorLogs.push(args),
  });

  const PilgrimSiteService = require(MODULES.TARGET);

  return {
    PilgrimSiteService,
    state,
    createSiteRecord,
    createFavoriteRecord: (data) => createFavoriteRecord(data, state, overrides),
  };
}

module.exports = {
  loadPilgrimSiteService,
  createSiteRecord,
  createFavoriteRecord,
};
