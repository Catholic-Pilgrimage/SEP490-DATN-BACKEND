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

function createUser(initialData, state) {
  return {
    ...initialData,
    async update(payload) {
      state.userUpdateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };
}

function loadAuthService(overrides = {}) {
  clearModules();

  const state = {
    userFindByPkCalls: [],
    userUpdateCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const mocks = {
    models: {
      User: {
        findByPk: async (userId) => {
          state.userFindByPkCalls.push(userId);
          if (overrides.userFindByPk) {
            return overrides.userFindByPk(userId, state);
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
        throw new Error('hash should not be called in updateProfile tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in updateProfile tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in updateProfile tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in updateProfile tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in updateProfile tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in updateProfile tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in updateProfile tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in updateProfile tests');
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

test('UTCID01: updateProfile updates allowed text fields successfully', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-1',
      email: 'existing_user@example.com',
      full_name: 'Old Name',
      avatar_url: 'https://example.com/avatar.png',
      phone: '0901111111',
      date_of_birth: '2000-01-01',
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: null,
      updated_at: null,
    }, state),
  });

  const result = await AuthService.updateProfile('user-1', {
    full_name: 'Updated User',
    phone: '0912345678',
    language: 'en',
  });

  assert.deepEqual(state.userFindByPkCalls, ['user-1']);
  assert.deepEqual(state.userUpdateCalls[0], {
    full_name: 'Updated User',
    phone: '0912345678',
    language: 'en',
  });
  assert.equal(result.full_name, 'Updated User');
  assert.equal(result.phone, '0912345678');
  assert.equal(result.language, 'en');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: updateProfile updates avatar_url and date_of_birth successfully', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-2',
      email: 'avatar_user@example.com',
      full_name: 'Avatar User',
      avatar_url: null,
      phone: '0902222222',
      date_of_birth: null,
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: null,
      updated_at: null,
    }, state),
  });

  const result = await AuthService.updateProfile('user-2', {
    avatar_url: 'https://example.com/new-avatar.png',
    date_of_birth: '1999-12-31',
  });

  assert.deepEqual(state.userUpdateCalls[0], {
    avatar_url: 'https://example.com/new-avatar.png',
    date_of_birth: '1999-12-31',
  });
  assert.equal(result.avatar_url, 'https://example.com/new-avatar.png');
  assert.equal(result.date_of_birth, '1999-12-31');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: updateProfile ignores disallowed fields and only updates allowed ones', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-3',
      email: 'mixed_user@example.com',
      full_name: 'Mixed User',
      avatar_url: 'https://example.com/original.png',
      phone: '0903333333',
      date_of_birth: '2001-01-01',
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: null,
      updated_at: null,
    }, state),
  });

  const result = await AuthService.updateProfile('user-3', {
    full_name: 'Allowed Name',
    role: 'admin',
    status: 'banned',
    password_hash: 'forbidden',
  });

  assert.deepEqual(state.userUpdateCalls[0], {
    full_name: 'Allowed Name',
  });
  assert.equal(result.full_name, 'Allowed Name');
  assert.equal(result.role, 'pilgrim');
  assert.equal(result.status, 'active');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID04: updateProfile allows clearing nullable optional fields with null', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-4',
      email: 'nullable_user@example.com',
      full_name: 'Nullable User',
      avatar_url: 'https://example.com/nullable.png',
      phone: '0904444444',
      date_of_birth: '2002-02-02',
      role: 'pilgrim',
      status: 'active',
      language: 'vi',
      created_at: null,
      updated_at: null,
    }, state),
  });

  const result = await AuthService.updateProfile('user-4', {
    avatar_url: null,
    phone: null,
  });

  assert.deepEqual(state.userUpdateCalls[0], {
    avatar_url: null,
    phone: null,
  });
  assert.equal(result.avatar_url, null);
  assert.equal(result.phone, null);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID05: updateProfile rejects when the user does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    AuthService.updateProfile('missing-user-id', {
      full_name: 'No User',
    }),
    { message: 'User not found' }
  );

  assert.deepEqual(state.userFindByPkCalls, ['missing-user-id']);
  assert.equal(state.userUpdateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
