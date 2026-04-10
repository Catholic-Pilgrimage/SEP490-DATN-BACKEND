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

function withFixedTimeAndRandom(nowMs, randomValue, fn) {
  const originalNow = Date.now;
  const originalRandom = Math.random;
  Date.now = () => nowMs;
  Math.random = () => randomValue;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      Date.now = originalNow;
      Math.random = originalRandom;
    });
}

function loadAuthService(overrides = {}) {
  clearModules();

  const state = {
    userFindOneCalls: [],
    passwordResetCreateCalls: [],
    sendOtpCalls: [],
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
        create: async (payload) => {
          state.passwordResetCreateCalls.push(payload);
          if (overrides.passwordResetCreate) {
            return overrides.passwordResetCreate(payload, state);
          }
          return payload;
        },
      },
    },
    bcrypt: {
      hash: async () => {
        throw new Error('hash should not be called in forgotPassword tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in forgotPassword tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in forgotPassword tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in forgotPassword tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in forgotPassword tests');
      },
      verifyToken: () => {
        throw new Error('verifyToken should not be called in forgotPassword tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async (email, otp) => {
        state.sendOtpCalls.push({ email, otp });
        if (overrides.sendOTP) {
          return overrides.sendOTP(email, otp, state);
        }
        return undefined;
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in forgotPassword tests');
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

test('UTCID01: forgotPassword succeeds for an existing email and sends OTP', { concurrency: false }, async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-1', email: 'existing_user@example.com' }),
  });

  await withFixedTimeAndRandom(1760000000000, 0.123456, async () => {
    const result = await AuthService.forgotPassword('existing_user@example.com');
    assert.equal(result, undefined);
  });

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.equal(state.passwordResetCreateCalls.length, 1);
  assert.equal(state.passwordResetCreateCalls[0].user_id, 'user-1');
  assert.equal(state.passwordResetCreateCalls[0].email, 'existing_user@example.com');
  assert.equal(state.sendOtpCalls.length, 1);
  assert.equal(state.sendOtpCalls[0].email, 'existing_user@example.com');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: forgotPassword normalizes email by trimming spaces and lowercasing', { concurrency: false }, async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-2', email: 'existing_user@example.com' }),
  });

  await withFixedTimeAndRandom(1760000000000, 0.2, async () => {
    await AuthService.forgotPassword(' EXISTING_USER@EXAMPLE.COM ');
  });

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_user@example.com' },
  });
  assert.equal(state.passwordResetCreateCalls[0].email, 'existing_user@example.com');
  assert.equal(state.sendOtpCalls[0].email, 'existing_user@example.com');
});

test('UTCID03: forgotPassword rejects when the email does not exist', { concurrency: false }, async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.forgotPassword('missing_user@example.com'),
    { message: 'Email not found' }
  );

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'missing_user@example.com' },
  });
  assert.equal(state.passwordResetCreateCalls.length, 0);
  assert.equal(state.sendOtpCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: forgotPassword generates a 6-digit OTP and expiry 10 minutes in the future', { concurrency: false }, async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-4', email: 'otp_user@example.com' }),
  });

  await withFixedTimeAndRandom(1760000000000, 0, async () => {
    await AuthService.forgotPassword('otp_user@example.com');
  });

  assert.equal(state.passwordResetCreateCalls.length, 1);
  assert.equal(state.passwordResetCreateCalls[0].otp, '100000');
  assert.equal(
    state.passwordResetCreateCalls[0].expires_at.getTime(),
    1760000000000 + 10 * 60 * 1000
  );
  assert.equal(state.sendOtpCalls[0].otp, '100000');
});

test('UTCID05: forgotPassword rethrows when email sending fails after creating reset record', { concurrency: false }, async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({ id: 'user-5', email: 'mail_fail@example.com' }),
    sendOTP: async () => {
      throw new Error('Email service unavailable');
    },
  });

  await assert.rejects(
    withFixedTimeAndRandom(1760000000000, 0.3, async () => {
      await AuthService.forgotPassword('mail_fail@example.com');
    }),
    { message: 'Email service unavailable' }
  );

  assert.equal(state.passwordResetCreateCalls.length, 1);
  assert.equal(state.sendOtpCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
});
