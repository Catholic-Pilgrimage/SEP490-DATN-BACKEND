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
    refreshTokenCreateCalls: [],
    bcryptCompareCalls: [],
    generateAccessTokenCalls: [],
    generateRefreshTokenCalls: [],
    hashTokenCalls: [],
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
        create: async (payload) => {
          state.refreshTokenCreateCalls.push(payload);
          if (overrides.refreshTokenCreate) {
            return overrides.refreshTokenCreate(payload, state);
          }
          return payload;
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
      hash: async () => {
        throw new Error('hash should not be called in login tests');
      },
    },
    jwtUtil: {
      generateAccessToken: (userId) => {
        state.generateAccessTokenCalls.push(userId);
        if (overrides.generateAccessToken) {
          return overrides.generateAccessToken(userId, state);
        }
        return `access-${userId}`;
      },
      generateRefreshToken: (userId) => {
        state.generateRefreshTokenCalls.push(userId);
        if (overrides.generateRefreshToken) {
          return overrides.generateRefreshToken(userId, state);
        }
        return `refresh-${userId}`;
      },
      hashToken: (token) => {
        state.hashTokenCalls.push(token);
        if (overrides.hashToken) {
          return overrides.hashToken(token, state);
        }
        return `hashed-${token}`;
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in login tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in login tests');
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

test('UTCID01: login succeeds for an active user with correct credentials', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-1',
      email: 'active_user@example.com',
      status: 'active',
      password_hash: 'stored-hash',
    }),
    bcryptCompare: async () => true,
  });

  const result = await AuthService.login('active_user@example.com', 'CorrectPassword123!');

  assert.deepEqual(result, {
    accessToken: 'access-user-1',
    refreshToken: 'refresh-user-1',
  });
  assert.equal(state.userFindOneCalls.length, 1);
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'active_user@example.com' },
  });
  assert.equal(state.refreshTokenCreateCalls.length, 1);
  assert.equal(state.refreshTokenCreateCalls[0].user_id, 'user-1');
  assert.equal(state.refreshTokenCreateCalls[0].token_hash, 'hashed-refresh-user-1');
  assert.match(String(state.refreshTokenCreateCalls[0].expires_at), /\d{4}/);
  assert.deepEqual(state.generateAccessTokenCalls, ['user-1']);
  assert.deepEqual(state.generateRefreshTokenCalls, ['user-1']);
  assert.deepEqual(state.hashTokenCalls, ['refresh-user-1']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: login normalizes email by trimming spaces and lowercasing', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-2',
      email: 'active_user@example.com',
      status: 'active',
      password_hash: 'stored-hash',
    }),
    bcryptCompare: async () => true,
  });

  const result = await AuthService.login(' ACTIVE_USER@EXAMPLE.COM ', 'CorrectPassword123!');

  assert.deepEqual(result, {
    accessToken: 'access-user-2',
    refreshToken: 'refresh-user-2',
  });
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'active_user@example.com' },
  });
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: login rejects when the user email does not exist', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => null,
  });

  await assert.rejects(
    AuthService.login('notfound_user@example.com', 'CorrectPassword123!'),
    { message: 'Invalid email or password' }
  );

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'notfound_user@example.com' },
  });
  assert.equal(state.refreshTokenCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: login rejects when the password is incorrect', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-4',
      email: 'active_user@example.com',
      status: 'active',
      password_hash: 'stored-hash',
    }),
    bcryptCompare: async () => false,
  });

  await assert.rejects(
    AuthService.login('active_user@example.com', 'WrongPassword123!'),
    { message: 'Invalid email or password' }
  );

  assert.equal(state.bcryptCompareCalls.length, 1);
  assert.equal(state.refreshTokenCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: login rejects when the account is banned', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'user-5',
      email: 'banned_user@example.com',
      status: 'banned',
      password_hash: 'stored-hash',
    }),
  });

  await assert.rejects(
    AuthService.login('banned_user@example.com', 'CorrectPassword123!'),
    { message: 'Account is banned' }
  );

  assert.equal(state.bcryptCompareCalls.length, 0);
  assert.equal(state.refreshTokenCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
