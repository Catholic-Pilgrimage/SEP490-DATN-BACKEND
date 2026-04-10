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
    userFindOneCalls: [],
    passwordResetFindOneCalls: [],
    passwordResetUpdateCalls: [],
    userUpdateCalls: [],
    refreshTokenDestroyCalls: [],
    bcryptHashCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const mocks = {
    models: {
      User: {
        findOne: async (query) => {
          state.userFindOneCalls.push(query);
          if (overrides.userFindOne) {
            return overrides.userFindOne(query, state);
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
      PasswordReset: {
        findOne: async (query) => {
          state.passwordResetFindOneCalls.push(query);
          if (overrides.passwordResetFindOne) {
            return overrides.passwordResetFindOne(query, state);
          }
          return null;
        },
      },
    },
    bcrypt: {
      hash: async (password, saltRounds) => {
        state.bcryptHashCalls.push({ password, saltRounds });
        if (overrides.bcryptHash) {
          return overrides.bcryptHash(password, saltRounds, state);
        }
        return `hashed-${password}`;
      },
      compare: async () => {
        throw new Error('compare should not be called in resetPassword tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in resetPassword tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in resetPassword tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in resetPassword tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in resetPassword tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in resetPassword tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in resetPassword tests');
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

test('UTCID01: resetPassword updates password, marks OTP as used, and clears refresh tokens', async () => {
  const user = {
    id: 'user-1',
    update: async (payload) => {
      state.userUpdateCalls.push(payload);
      return payload;
    },
  };
  const resetRecord = {
    expires_at: new Date(Date.now() + 10 * 60 * 1000),
    update: async (payload) => {
      state.passwordResetUpdateCalls.push(payload);
      return payload;
    },
  };
  const state = {
    userUpdateCalls: [],
    passwordResetUpdateCalls: [],
  };

  const { AuthService, state: runtimeState } = loadAuthService({
    userFindOne: async () => ({
      id: user.id,
      update: async (payload) => {
        state.userUpdateCalls.push(payload);
        return payload;
      },
    }),
    passwordResetFindOne: async () => ({
      expires_at: resetRecord.expires_at,
      update: async (payload) => {
        state.passwordResetUpdateCalls.push(payload);
        return payload;
      },
    }),
  });

  const result = await AuthService.resetPassword('existing_user@example.com', '123456', 'NewPassword123!');

  assert.equal(result, undefined);
  assert.deepEqual(runtimeState.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.deepEqual(runtimeState.passwordResetFindOneCalls[0], {
    where: {
      user_id: 'user-1',
      otp: '123456',
      is_used: false,
    },
    order: [['created_at', 'DESC']],
  });
  assert.deepEqual(runtimeState.bcryptHashCalls[0], {
    password: 'NewPassword123!',
    saltRounds: 10,
  });
  assert.deepEqual(state.userUpdateCalls[0], {
    password_hash: 'hashed-NewPassword123!',
  });
  assert.deepEqual(state.passwordResetUpdateCalls[0], {
    is_used: true,
  });
  assert.deepEqual(runtimeState.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-1' },
  });
  assert.equal(runtimeState.errorLogs.length, 0);
});

test('UTCID02: resetPassword normalizes email by trimming spaces and lowercasing', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-2',
      update: async () => undefined,
    }),
    passwordResetFindOne: async () => ({
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      update: async () => undefined,
    }),
  });

  await AuthService.resetPassword(' EXISTING_USER@EXAMPLE.COM ', '123456', 'NewPassword123!');

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: resetPassword rejects when the user does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.resetPassword('missing_user@example.com', '123456', 'NewPassword123!'),
    { message: 'User not found' }
  );

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'missing_user@example.com' },
  });
  assert.equal(state.passwordResetFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: resetPassword rejects when the OTP is invalid or already used', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-4',
      update: async () => undefined,
    }),
    passwordResetFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.resetPassword('existing_user@example.com', '000000', 'NewPassword123!'),
    { message: 'Invalid OTP' }
  );

  assert.equal(state.passwordResetFindOneCalls.length, 1);
  assert.equal(state.bcryptHashCalls.length, 0);
  assert.equal(state.refreshTokenDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: resetPassword rejects when the OTP has expired', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-5',
      update: async () => undefined,
    }),
    passwordResetFindOne: async () => ({
      expires_at: new Date(Date.now() - 60 * 1000),
      update: async () => undefined,
    }),
  });

  await assert.rejects(
    AuthService.resetPassword('existing_user@example.com', '123456', 'NewPassword123!'),
    { message: 'OTP has expired' }
  );

  assert.equal(state.bcryptHashCalls.length, 0);
  assert.equal(state.refreshTokenDestroyCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
