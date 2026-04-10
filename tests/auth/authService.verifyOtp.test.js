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
      RefreshToken: {},
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
      hash: async () => {
        throw new Error('hash should not be called in verifyOtp tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in verifyOtp tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in verifyOtp tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in verifyOtp tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in verifyOtp tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in verifyOtp tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in verifyOtp tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in verifyOtp tests');
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

test('UTCID01: verifyOtp returns verified true for a valid unused OTP', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-1', email: 'existing_user@example.com' }),
    passwordResetFindOne: async () => ({
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    }),
  });

  const result = await AuthService.verifyOtp('existing_user@example.com', '123456');

  assert.deepEqual(result, { verified: true });
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.deepEqual(state.passwordResetFindOneCalls[0], {
    where: {
      user_id: 'user-1',
      otp: '123456',
      is_used: false,
    },
    order: [['created_at', 'DESC']],
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: verifyOtp normalizes email by trimming spaces and lowercasing', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-2', email: 'existing_user@example.com' }),
    passwordResetFindOne: async () => ({
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
    }),
  });

  const result = await AuthService.verifyOtp(' EXISTING_USER@EXAMPLE.COM ', '123456');

  assert.deepEqual(result, { verified: true });
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: verifyOtp rejects when the user does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.verifyOtp('missing_user@example.com', '123456'),
    { message: 'User not found' }
  );

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'missing_user@example.com' },
  });
  assert.equal(state.passwordResetFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: verifyOtp rejects when the OTP is invalid or already used', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-4', email: 'existing_user@example.com' }),
    passwordResetFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.verifyOtp('existing_user@example.com', '000000'),
    { message: 'Invalid OTP' }
  );

  assert.equal(state.passwordResetFindOneCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: verifyOtp rejects when the OTP has expired', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-5', email: 'existing_user@example.com' }),
    passwordResetFindOne: async () => ({
      expires_at: new Date(Date.now() - 60 * 1000),
    }),
  });

  await assert.rejects(
    AuthService.verifyOtp('existing_user@example.com', '123456'),
    { message: 'OTP has expired' }
  );

  assert.equal(state.passwordResetFindOneCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
});
