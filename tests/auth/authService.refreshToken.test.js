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
    refreshTokenFindOneCalls: [],
    refreshTokenDestroyCalls: 0,
    verifyTokenCalls: [],
    hashTokenCalls: [],
    generateAccessTokenCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const mocks = {
    models: {
      User: {},
      RefreshToken: {
        findOne: async (query) => {
          state.refreshTokenFindOneCalls.push(query);
          if (overrides.refreshTokenFindOne) {
            return overrides.refreshTokenFindOne(query, state);
          }
          return null;
        },
      },
      BlacklistedToken: {},
      PasswordReset: {},
    },
    bcrypt: {
      hash: async () => {
        throw new Error('hash should not be called in refresh token tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in refresh token tests');
      },
    },
    jwtUtil: {
      verifyToken: (token) => {
        state.verifyTokenCalls.push(token);
        if (overrides.verifyToken) {
          return overrides.verifyToken(token, state);
        }
        return null;
      },
      hashToken: (token) => {
        state.hashTokenCalls.push(token);
        if (overrides.hashToken) {
          return overrides.hashToken(token, state);
        }
        return `hashed-${token}`;
      },
      generateAccessToken: (userId) => {
        state.generateAccessTokenCalls.push(userId);
        if (overrides.generateAccessToken) {
          return overrides.generateAccessToken(userId, state);
        }
        return `access-${userId}`;
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in refresh token tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in refresh token tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in refresh token tests');
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

test('UTCID01: refreshToken returns a new access token for a valid refresh token', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ userId: 'user-1', type: 'refresh' }),
    refreshTokenFindOne: async () => ({
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }),
  });

  const result = await AuthService.refreshToken('valid-refresh-token');

  assert.deepEqual(result, { accessToken: 'access-user-1' });
  assert.deepEqual(state.verifyTokenCalls, ['valid-refresh-token']);
  assert.deepEqual(state.hashTokenCalls, ['valid-refresh-token']);
  assert.deepEqual(state.refreshTokenFindOneCalls[0], {
    where: { token_hash: 'hashed-valid-refresh-token', user_id: 'user-1' },
  });
  assert.deepEqual(state.generateAccessTokenCalls, ['user-1']);
  assert.equal(state.refreshTokenDestroyCalls, 0);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: refreshToken rejects an invalid refresh token', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => null,
  });

  await assert.rejects(
    AuthService.refreshToken('invalid-refresh-token'),
    { message: 'Invalid refresh token' }
  );

  assert.deepEqual(state.verifyTokenCalls, ['invalid-refresh-token']);
  assert.equal(state.hashTokenCalls.length, 0);
  assert.equal(state.refreshTokenFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID03: refreshToken rejects a token with invalid token type', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ userId: 'user-3', type: 'access' }),
  });

  await assert.rejects(
    AuthService.refreshToken('wrong-type-token'),
    { message: 'Invalid token type' }
  );

  assert.deepEqual(state.verifyTokenCalls, ['wrong-type-token']);
  assert.equal(state.hashTokenCalls.length, 0);
  assert.equal(state.refreshTokenFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: refreshToken rejects when the token hash is not found in the database', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ userId: 'user-4', type: 'refresh' }),
    refreshTokenFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.refreshToken('missing-db-token'),
    { message: 'Refresh token not found' }
  );

  assert.deepEqual(state.hashTokenCalls, ['missing-db-token']);
  assert.equal(state.refreshTokenFindOneCalls.length, 1);
  assert.equal(state.generateAccessTokenCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: refreshToken deletes and rejects an expired stored token', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ userId: 'user-5', type: 'refresh' }),
    refreshTokenFindOne: async () => ({
      expires_at: new Date(Date.now() - 60 * 1000),
      destroy: async () => {
        state.refreshTokenDestroyCalls += 1;
      },
    }),
  });

  await assert.rejects(
    AuthService.refreshToken('expired-refresh-token'),
    { message: 'Refresh token expired' }
  );

  assert.deepEqual(state.hashTokenCalls, ['expired-refresh-token']);
  assert.equal(state.refreshTokenDestroyCalls, 1);
  assert.equal(state.generateAccessTokenCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
