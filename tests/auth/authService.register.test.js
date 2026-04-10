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
        create: async (userData) => {
          state.userCreateCalls.push(userData);
          if (overrides.userCreate) {
            return overrides.userCreate(userData, state);
          }
          return {
            id: 'new-user-id',
            email: userData.email,
            full_name: userData.full_name,
            role: 'pilgrim',
            ...userData,
          };
        },
      },
      RefreshToken: {},
      BlacklistedToken: {},
      PasswordReset: {},
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
        throw new Error('compare should not be called in register tests');
      },
    },
    jwtUtil: {
      generateAccessToken: () => {
        throw new Error('generateAccessToken should not be called in register tests');
      },
      generateRefreshToken: () => {
        throw new Error('generateRefreshToken should not be called in register tests');
      },
      hashToken: () => {
        throw new Error('hashToken should not be called in register tests');
      },
    },
    logger: {
      info: (...args) => state.infoLogs.push(args),
      error: (...args) => state.errorLogs.push(args),
    },
    emailService: {
      sendOTP: async () => {
        throw new Error('sendOTP should not be called in register tests');
      },
    },
    firebaseConfig: {
      apps: [],
      auth() {
        throw new Error('Firebase auth should not be called in register tests');
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

test('UTCID01: register succeeds with valid user data', async () => {
  const { AuthService, state } = loadAuthService();

  const userData = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    full_name: 'New User',
    phone: '0123456789',
    date_of_birth: '1990-01-01',
    language: 'en',
  };

  const result = await AuthService.register(userData);

  assert.deepEqual(result, {
    user: {
      id: 'new-user-id',
      email: 'newuser@example.com',
      full_name: 'New User',
      role: 'pilgrim',
    },
  });

  assert.equal(state.userFindOneCalls.length, 1);
  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'newuser@example.com' },
  });

  assert.equal(state.bcryptHashCalls.length, 1);
  assert.equal(state.bcryptHashCalls[0].password, 'SecurePass123!');
  assert.equal(state.bcryptHashCalls[0].saltRounds, 10);

  assert.equal(state.userCreateCalls.length, 1);
  assert.equal(state.userCreateCalls[0].email, 'newuser@example.com');
  assert.equal(state.userCreateCalls[0].password_hash, 'hashed-SecurePass123!');
  assert.equal(state.userCreateCalls[0].full_name, 'New User');
  assert.equal(state.userCreateCalls[0].phone, '0123456789');
  assert.equal(state.userCreateCalls[0].date_of_birth, '1990-01-01');
  assert.equal(state.userCreateCalls[0].language, 'en');

  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: register normalizes email by trimming and lowercasing', async () => {
  const { AuthService, state } = loadAuthService();

  const userData = {
    email: '  NEWUSER@EXAMPLE.COM  ',
    password: 'SecurePass123!',
    full_name: 'New User',
    phone: '0123456789',
    date_of_birth: '1990-01-01',
  };

  await AuthService.register(userData);

  assert.deepEqual(state.userFindOneCalls[0], {
    where: { email: 'newuser@example.com' },
  });

  assert.equal(state.userCreateCalls[0].email, 'newuser@example.com');
});

test('UTCID03: register uses default language "vi" when not provided', async () => {
  const { AuthService, state } = loadAuthService();

  const userData = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    full_name: 'New User',
    phone: '0123456789',
    date_of_birth: '1990-01-01',
  };

  await AuthService.register(userData);

  assert.equal(state.userCreateCalls[0].language, 'vi');
});

test('UTCID04: register rejects when email already exists', async () => {
  const { AuthService, state } = loadAuthService({
    userFindOne: async () => ({
      id: 'existing-user-id',
      email: 'existing@example.com',
    }),
  });

  const userData = {
    email: 'existing@example.com',
    password: 'SecurePass123!',
    full_name: 'New User',
    phone: '0123456789',
    date_of_birth: '1990-01-01',
  };

  await assert.rejects(
    AuthService.register(userData),
    { message: 'Email already registered' }
  );

  assert.equal(state.userFindOneCalls.length, 1);
  assert.equal(state.userCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: register hashes password with bcrypt salt rounds 10', async () => {
  const { AuthService, state } = loadAuthService();

  const userData = {
    email: 'newuser@example.com',
    password: 'MyPassword123!',
    full_name: 'New User',
    phone: '0123456789',
    date_of_birth: '1990-01-01',
  };

  await AuthService.register(userData);

  assert.equal(state.bcryptHashCalls.length, 1);
  assert.equal(state.bcryptHashCalls[0].password, 'MyPassword123!');
  assert.equal(state.bcryptHashCalls[0].saltRounds, 10);
  assert.equal(state.userCreateCalls[0].password_hash, 'hashed-MyPassword123!');
});

test('UTCID06: register creates user with all provided fields', async () => {
  const { AuthService, state } = loadAuthService();

  const userData = {
    email: 'complete@example.com',
    password: 'Pass123!',
    full_name: 'Complete User',
    phone: '0987654321',
    date_of_birth: '1995-05-15',
    language: 'vi',
  };

  await AuthService.register(userData);

  const createdUser = state.userCreateCalls[0];
  assert.equal(createdUser.email, 'complete@example.com');
  assert.equal(createdUser.password_hash, 'hashed-Pass123!');
  assert.equal(createdUser.full_name, 'Complete User');
  assert.equal(createdUser.phone, '0987654321');
  assert.equal(createdUser.date_of_birth, '1995-05-15');
  assert.equal(createdUser.language, 'vi');
});
