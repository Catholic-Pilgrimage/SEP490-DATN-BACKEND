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
    refreshTokenDestroyCalls: [],
    blacklistedTokenCreateCalls: [],
    verifyTokenCalls: [],
    infoLogs: [],
    errorLogs: [],
  };

  const mocks = {
    models: {
      User: {},
      RefreshToken: {
        destroy: async (query) => {
          state.refreshTokenDestroyCalls.push(query);
          if (overrides.refreshTokenDestroy) {
            return overrides.refreshTokenDestroy(query, state);
          }
          return 1;
        },
      },
      BlacklistedToken: {
        create: async (payload) => {
          state.blacklistedTokenCreateCalls.push(payload);
          if (overrides.blacklistedTokenCreate) {
            return overrides.blacklistedTokenCreate(payload, state);
          }
          return payload;
        },
      },
      PasswordReset: {},
    },
    bcrypt: {
      hash: async () => {
        throw new Error('hash should not be called in logout tests');
      },
      compare: async () => {
        throw new Error('compare should not be called in logout tests');
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
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in logout tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in logout tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in logout tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in logout tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in logout tests');
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

test('UTCID01: logout removes refresh tokens and blacklists a valid access token', async () => {
  const accessToken = 'valid-access-token';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ exp }),
  });

  const result = await AuthService.logout(accessToken, 'user-1');

  assert.equal(result, undefined);
  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-1' },
  });
  assert.deepEqual(state.verifyTokenCalls, [accessToken]);
  assert.equal(state.blacklistedTokenCreateCalls.length, 1);
  assert.equal(state.blacklistedTokenCreateCalls[0].token, accessToken);
  assert.equal(
    state.blacklistedTokenCreateCalls[0].expires_at.getTime(),
    new Date(exp * 1000).getTime()
  );
  assert.deepEqual(state.infoLogs[0], ['User logged out: user-1']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: logout succeeds without access token and only removes refresh tokens', async () => {
  const { AuthService, state } = loadAuthService();

  const result = await AuthService.logout('', 'user-2');

  assert.equal(result, undefined);
  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-2' },
  });
  assert.equal(state.verifyTokenCalls.length, 0);
  assert.equal(state.blacklistedTokenCreateCalls.length, 0);
  assert.deepEqual(state.infoLogs[0], ['User logged out: user-2']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: logout succeeds when access token cannot be decoded and skips blacklist creation', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => null,
  });

  const result = await AuthService.logout('undecodable-access-token', 'user-3');

  assert.equal(result, undefined);
  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-3' },
  });
  assert.deepEqual(state.verifyTokenCalls, ['undecodable-access-token']);
  assert.equal(state.blacklistedTokenCreateCalls.length, 0);
  assert.deepEqual(state.infoLogs[0], ['User logged out: user-3']);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID04: logout rejects when removing refresh tokens fails', async () => {
  const { AuthService, state } = loadAuthService({
    refreshTokenDestroy: async () => {
      throw new Error('Refresh token destroy failed');
    },
  });

  await assert.rejects(
    AuthService.logout('valid-access-token', 'user-4'),
    { message: 'Refresh token destroy failed' }
  );

  assert.equal(state.verifyTokenCalls.length, 0);
  assert.equal(state.blacklistedTokenCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: logout rejects when blacklisting the access token fails', async () => {
  const { AuthService, state } = loadAuthService({
    verifyToken: () => ({ exp: Math.floor(Date.now() / 1000) + 1800 }),
    blacklistedTokenCreate: async () => {
      throw new Error('Blacklist create failed');
    },
  });

  await assert.rejects(
    AuthService.logout('valid-access-token', 'user-5'),
    { message: 'Blacklist create failed' }
  );

  assert.deepEqual(state.refreshTokenDestroyCalls[0], {
    where: { user_id: 'user-5' },
  });
  assert.deepEqual(state.verifyTokenCalls, ['valid-access-token']);
  assert.equal(state.blacklistedTokenCreateCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
});
