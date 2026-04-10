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
    userCreateCalls: [],
    refreshTokenCreateCalls: [],
    verifyIdTokenCalls: [],
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
        create: async (payload) => {
          state.userCreateCalls.push(payload);
          if (overrides.userCreate) {
            return overrides.userCreate(payload, state);
          }
          return {
            id: 'created-user',
            ...payload,
          };
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
      hash: async () => {
        throw new Error('hash should not be called in loginWithGoogle tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in loginWithGoogle tests');
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
      verifyToken: () => {
        throw new Error('verifyToken should not be called in loginWithGoogle tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in loginWithGoogle tests');
      },
    },
    firebaseConfig: {
      apps: overrides.apps ?? [{}],
      auth() {
        return {
          verifyIdToken: async (firebaseToken) => {
            state.verifyIdTokenCalls.push(firebaseToken);
            if (overrides.verifyIdToken) {
              return overrides.verifyIdToken(firebaseToken, state);
            }
            throw new Error('verifyIdToken should be overridden in loginWithGoogle tests');
          },
        };
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

test('UTCID01: loginWithGoogle succeeds for an existing active user', async () => {
  const { AuthService, state } = loadAuthService({
    verifyIdToken: async () => ({
      email: 'existing_google_user@example.com',
      name: 'Existing Google User',
      picture: 'https://example.com/existing.png',
    }),
    userFindOne: async () => ({
      id: 'user-1',
      email: 'existing_google_user@example.com',
      full_name: 'Existing Google User',
      role: 'pilgrim',
      avatar_url: 'https://example.com/existing.png',
      language: 'en',
      status: 'active',
    }),
  });

  const result = await AuthService.loginWithGoogle('valid-google-token');

  assert.deepEqual(result, {
    user: {
      id: 'user-1',
      email: 'existing_google_user@example.com',
      full_name: 'Existing Google User',
      role: 'pilgrim',
      avatar_url: 'https://example.com/existing.png',
      language: 'en',
    },
    accessToken: 'access-user-1',
    refreshToken: 'refresh-user-1',
  });
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_google_user@example.com' },
  });
  assert.equal(state.userCreateCalls.length, 0);
  assert.equal(state.refreshTokenCreateCalls.length, 1);
  assert.equal(state.refreshTokenCreateCalls[0].user_id, 'user-1');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: loginWithGoogle normalizes Firebase email before finding an existing user', async () => {
  const { AuthService, state } = loadAuthService({
    verifyIdToken: async () => ({
      email: ' EXISTING_GOOGLE_USER@EXAMPLE.COM ',
      name: 'Existing Google User',
      picture: 'https://example.com/existing.png',
    }),
    userFindOne: async () => ({
      id: 'user-2',
      email: 'existing_google_user@example.com',
      full_name: 'Existing Google User',
      role: 'pilgrim',
      avatar_url: 'https://example.com/existing.png',
      language: 'vi',
      status: 'active',
    }),
  });

  const result = await AuthService.loginWithGoogle('normalized-google-token');

  assert.equal(result.user.email, 'existing_google_user@example.com');
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'existing_google_user@example.com' },
  });
  assert.equal(state.userCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: loginWithGoogle auto-registers a new Google user with default fields', async () => {
  const { AuthService, state } = loadAuthService({
    verifyIdToken: async () => ({
      email: 'new_google_user@example.com',
      name: undefined,
      picture: 'https://example.com/new.png',
    }),
    userFindOne: async () => null,
    userCreate: async (payload) => ({
      id: 'user-3',
      ...payload,
    }),
  });

  const result = await AuthService.loginWithGoogle('new-google-token');

  assert.deepEqual(state.userCreateCalls[0], {
    email: 'new_google_user@example.com',
    full_name: 'Google User',
    avatar_url: 'https://example.com/new.png',
    role: 'pilgrim',
    status: 'active',
    is_verified: true,
    language: 'vi',
  });
  assert.deepEqual(result.user, {
    id: 'user-3',
    email: 'new_google_user@example.com',
    full_name: 'Google User',
    role: 'pilgrim',
    avatar_url: 'https://example.com/new.png',
    language: 'vi',
  });
  assert.equal(state.refreshTokenCreateCalls.length, 1);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID04: loginWithGoogle rejects when the Google-linked account is banned', async () => {
  const { AuthService, state } = loadAuthService({
    verifyIdToken: async () => ({
      email: 'banned_google_user@example.com',
      name: 'Banned User',
      picture: null,
    }),
    userFindOne: async () => ({
      id: 'user-4',
      email: 'banned_google_user@example.com',
      status: 'banned',
    }),
  });

  await assert.rejects(
    AuthService.loginWithGoogle('banned-google-token'),
    { message: 'Account is banned' }
  );

  assert.equal(state.userCreateCalls.length, 0);
  assert.equal(state.refreshTokenCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: loginWithGoogle rejects when Firebase Admin is not initialized', async () => {
  const { AuthService, state } = loadAuthService({
    apps: [],
  });

  await assert.rejects(
    AuthService.loginWithGoogle('firebase-not-ready-token'),
    { message: 'Firebase Admin is not initialized' }
  );

  assert.equal(state.verifyIdTokenCalls.length, 0);
  assert.equal(state.userFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID06: loginWithGoogle rejects when Firebase token verification fails', async () => {
  const { AuthService, state } = loadAuthService({
    verifyIdToken: async () => {
      throw new Error('Firebase token invalid');
    },
  });

  await assert.rejects(
    AuthService.loginWithGoogle('invalid-google-token'),
    { message: 'Firebase token invalid' }
  );

  assert.deepEqual(state.verifyIdTokenCalls, ['invalid-google-token']);
  assert.equal(state.userFindOneCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
