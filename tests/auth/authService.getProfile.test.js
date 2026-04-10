const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const TARGET = path.join(ROOT, 'services', 'shared', 'authService.js');
const MODELS = path.join(ROOT, 'models', 'index.js');
const JWT_UTIL = path.join(ROOT, 'utils', 'jwt.util.js');
const LOGGER = path.join(ROOT, 'utils', 'logger.util.js');
const EMAIL_SERVICE = path.join(ROOT, 'services', 'shared', 'emailService.js');
const FIREBASE_CONFIG = path.join(ROOT, 'config', 'firebase.config.js');
const BCRYPT = require.resolve('bcryptjs');

function setMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearModules() {
  [
    TARGET,
    MODELS,
    JWT_UTIL,
    LOGGER,
    EMAIL_SERVICE,
    FIREBASE_CONFIG,
    BCRYPT,
  ].forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

function loadAuthService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const mocks = {
    models: {
      User: {
        findByPk: async (userId, options) => {
          state.userFindByPkCalls.push({ userId, options });
          if (overrides.userFindByPk) {
            return overrides.userFindByPk(userId, options, state);
          }
          return null;
        },
      },
      RefreshToken: {},
      BlacklistedToken: {},
      PasswordReset: {},
    },
    bcrypt: {
      hash: async () => {
        throw new Error('hash should not be called in getProfile tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in getProfile tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in getProfile tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in getProfile tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in getProfile tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in getProfile tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in getProfile tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in getProfile tests');
      },
    },
  };

  setMock(MODELS, mocks.models);
  setMock(BCRYPT, mocks.bcrypt);
  setMock(JWT_UTIL, mocks.jwtUtil);
  setMock(LOGGER, mocks.logger);
  setMock(EMAIL_SERVICE, mocks.emailService);
  setMock(FIREBASE_CONFIG, mocks.firebaseConfig);

  const AuthService = require(TARGET);
  return { AuthService, state };
}

test('UTCID01: getProfile returns a full profile without password_hash', async () => {
  const createdAt = new Date('2026-03-01T10:00:00.000Z');
  const updatedAt = new Date('2026-03-20T09:00:00.000Z');
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => ({
      id: 'user-1',
      email: 'existing_user@example.com',
      full_name: 'Existing User',
      avatar_url: 'https://example.com/avatar.png',
      phone: '0901234567',
      date_of_birth: '2000-01-01',
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: createdAt,
      updated_at: updatedAt,
      password_hash: 'should-not-be-returned',
    }),
  });

  const result = await AuthService.getProfile('user-1');

  assert.deepEqual(result, {
    id: 'user-1',
    email: 'existing_user@example.com',
    full_name: 'Existing User',
    avatar_url: 'https://example.com/avatar.png',
    phone: '0901234567',
    date_of_birth: '2000-01-01',
    role: 'pilgrim',
    status: 'active',
    language: 'vi',
    created_at: createdAt,
    updated_at: updatedAt,
  });
  assert.equal('password_hash' in result, false);
  assert.deepEqual(state.userFindByPkCalls[0], {
    userId: 'user-1',
    options: {
      attributes: { exclude: ['password_hash'] },
    },
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: getProfile returns nullable profile fields as null', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => ({
      id: 'user-2',
      email: 'minimal_user@example.com',
      full_name: 'Minimal User',
      avatar_url: null,
      phone: null,
      date_of_birth: null,
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: null,
      updated_at: null,
    }),
  });

  const result = await AuthService.getProfile('user-2');

  assert.deepEqual(result, {
    id: 'user-2',
    email: 'minimal_user@example.com',
    full_name: 'Minimal User',
    avatar_url: null,
    phone: null,
    date_of_birth: null,
    role: 'pilgrim',
    status: 'active',
    language: 'vi',
    created_at: null,
    updated_at: null,
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: getProfile rejects when the user does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    AuthService.getProfile('missing-user-id'),
    { message: 'User not found' }
  );

  assert.deepEqual(state.userFindByPkCalls[0], {
    userId: 'missing-user-id',
    options: {
      attributes: { exclude: ['password_hash'] },
    },
  });
  assert.equal(state.errorLogs.length, 1);
});
