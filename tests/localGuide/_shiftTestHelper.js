const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const MODULES = {
    TARGET: path.join(ROOT, 'services', 'localGuide', 'shiftService.js'),
    MODELS: path.join(ROOT, 'models', 'index.js'),
    LOGGER: path.join(ROOT, 'utils', 'logger.util.js'),
    NOTIFICATION: path.join(ROOT, 'services', 'shared', 'notificationService.js'),
    DATABASE: path.join(ROOT, 'config', 'database.js'),
    APP_CONFIG: path.join(ROOT, 'config', 'app.config.js'),
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
        id: 'site-1',
        name: 'La Vang Shrine',
        address: 'Hue',
        opening_hours: { open: '08:00', close: '17:00' },
        ...data,
    };
}

function createEventRecord(data) {
    return {
        id: 'event-1',
        site_id: 'site-1',
        name: 'Evening Festival',
        start_date: '2026-04-13',
        end_date: null,
        start_time: '18:00:00',
        end_time: '22:00:00',
        status: 'approved',
        is_active: true,
        ...data,
    };
}

function loadShiftService(overrides = {}) {
    clearModules();

    const state = {
        userFindByPkCalls: [],
        siteFindByPkCalls: [],
        eventFindAllCalls: [],
        submissionFindOneCalls: [],
        submissionFindAllCalls: [],
        submissionCreateCalls: [],
        shiftCreateCalls: [],
        shiftDestroyCalls: [],
        notifyCalls: [],
        infoLogs: [],
        errorLogs: [],
    };

    const mockTransaction = async (fn) => {
        const t = { LOCK: { UPDATE: 'UPDATE' } };
        return fn(t);
    };

    setMock(MODULES.DATABASE, { transaction: mockTransaction });
    setMock(MODULES.APP_CONFIG, { timezone: 'Asia/Ho_Chi_Minh' });

    setMock(MODULES.MODELS, {
        User: {
            findByPk: async (userId) => {
                state.userFindByPkCalls.push(userId);
                if (overrides.userFindByPk) return overrides.userFindByPk(userId, state);
                return { id: userId, site_id: 'site-1', full_name: 'Guide A', email: 'a@test.com' };
            },
        },
        Site: {
            findByPk: async (siteId) => {
                state.siteFindByPkCalls.push(siteId);
                if (overrides.siteFindByPk) return overrides.siteFindByPk(siteId, state);
                return createSiteRecord();
            },
        },
        Event: {
            findAll: async (options) => {
                state.eventFindAllCalls.push(options);
                if (overrides.eventFindAll) return overrides.eventFindAll(options, state);
                return [];
            },
        },
        GuideShiftSubmission: {
            findOne: async (options) => {
                state.submissionFindOneCalls.push(options);
                if (overrides.submissionFindOne) return overrides.submissionFindOne(options, state);
                return null;
            },
            findAll: async (options) => {
                state.submissionFindAllCalls.push(options);
                if (overrides.submissionFindAll) return overrides.submissionFindAll(options, state);
                return [];
            },
            create: async (data, opts) => {
                state.submissionCreateCalls.push(data);
                if (overrides.submissionCreate) return overrides.submissionCreate(data, opts, state);
                return { id: 'sub-1', ...data };
            },
        },
        GuideShift: {
            create: async (data, opts) => {
                state.shiftCreateCalls.push(data);
                if (overrides.shiftCreate) return overrides.shiftCreate(data, opts, state);
                return { id: `shift-${state.shiftCreateCalls.length}`, ...data };
            },
            destroy: async (options) => {
                state.shiftDestroyCalls.push(options);
            },
        },
    });

    setMock(MODULES.LOGGER, {
        info: (...args) => state.infoLogs.push(args),
        error: (...args) => state.errorLogs.push(args),
        warn: (...args) => state.infoLogs.push(args),
    });

    setMock(MODULES.NOTIFICATION, {
        notifySiteManager: async (...args) => {
            state.notifyCalls.push(args);
        },
        createNotification: async (...args) => {
            state.notifyCalls.push(args);
        },
    });

    const LocalGuideShiftService = require(MODULES.TARGET);

    return {
        LocalGuideShiftService,
        state,
        createSiteRecord,
        createEventRecord,
    };
}

module.exports = {
    loadShiftService,
    createSiteRecord,
    createEventRecord,
};
