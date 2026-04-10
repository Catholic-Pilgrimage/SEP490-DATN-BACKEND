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
    refreshTokenDestroyCalls: [],
    bcryptCompareCalls: [],
    bcryptHashCalls: [],
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
      RefreshToken: {
        destroy: async (query) => {
          state.refreshTokenDestroyCalls.push(query);
          if (overrides.refreshTokenDestroy) {
            return overrides.refreshTokenDestroy(query, state);
          }
          return 1;
        },
      },
      BlacklistedToken: {},
      PasswordReset: {},
    },
    bcrypt: {
      compare: async (plainText, hash) => {
        state.bcryptCompareCalls.push({ plainText, hash });
        if (overrides.bcryptCompare) {
          return overrides.bcryptCompare(plainText, hash, state);
        }
        return false;
      },
      hash: async (password, saltRounds) => {
        state.bcryptHashCalls.push({ password, saltRounds });
        if (overrides.bcryptHash) {
          return overrides.bcryptHash(password, saltRounds, state);
        }
        return `hashed-${password}`;
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in changePassword tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in changePassword tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in changePassword tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in changePassword tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in changePassword tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in changePassword tests');
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

test('UTCID01: changePassword updates password hash and removes refresh tokens for a valid user', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-1',
      password_hash: 'stored-hash',
    }, state),
    bcryptCompare: async () => true,
  });

  const result = await AuthService.changePassword('user-1', 'CurrentPassword123!', 'NewPassword123!');

  assert.equal(result, undefined);
  assert.deepEqual(state.userFindByPkCalls, ['user-1']);
  assert.deepEqual(state.bcryptCompareCalls[0], {
    plainText: 'CurrentPassword123!',
    hash: 'stored-hash',
  });
  assert.deepEqual(state.bcryptHashCalls[0], {
    password: 'NewPassword123!',
    saltRounds: 10,
  });
  assert.deepEqual(state.userUpdateCalls[0], {
    password_hash: 'hashed-NewPassword123!',
  });
  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-1' },
  });
  assert.deepEqual(state.infoLogs[0], ['Password changed: user-1']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: changePassword still succeeds when no refresh tokens are found to revoke', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-2',
      password_hash: 'stored-hash-2',
    }, state),
    bcryptCompare: async () => true,
    refreshTokenDestroy: async () => 0,
  });

  const result = await AuthService.changePassword('user-2', 'CurrentPassword123!', 'BoundaryPassword123!');

  assert.equal(result, undefined);
  assert.deepEqual(state.userUpdateCalls[0], {
    password_hash: 'hashed-BoundaryPassword123!',
  });
  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-2' },
  });
  assert.deepEqual(state.infoLogs[0], ['Password changed: user-2']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: changePassword rejects when the user does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    AuthService.changePassword('missing-user-id', 'CurrentPassword123!', 'NewPassword123!'),
    { message: 'User not found' }
  );

  assert.deepEqual(state.userFindByPkCalls, ['missing-user-id']);
  assert.equal(state.bcryptCompareCalls.length, 0);
  assert.equal(state.userUpdateCalls.length, 0);
  assert.equal(state.refreshTokenDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: changePassword rejects when the current password is incorrect', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-4',
      password_hash: 'stored-hash-4',
    }, state),
    bcryptCompare: async () => false,
  });

  await assert.rejects(
    AuthService.changePassword('user-4', 'WrongCurrentPassword!', 'NewPassword123!'),
    { message: 'Current password is incorrect' }
  );

  assert.equal(state.bcryptHashCalls.length, 0);
  assert.equal(state.userUpdateCalls.length, 0);
  assert.equal(state.refreshTokenDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: changePassword rejects when password hashing fails', async () => {
  const { AuthService, state } = loadAuthService({
    userFindByPk: async () => createUser({
      id: 'user-5',
      password_hash: 'stored-hash-5',
    }, state),
    bcryptCompare: async () => true,
    bcryptHash: async () => {
      throw new Error('Hashing failed');
    },
  });

  await assert.rejects(
    AuthService.changePassword('user-5', 'CurrentPassword123!', 'NewPassword123!'),
    { message: 'Hashing failed' }
  );

  assert.equal(state.userUpdateCalls.length, 0);
  assert.equal(state.refreshTokenDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
