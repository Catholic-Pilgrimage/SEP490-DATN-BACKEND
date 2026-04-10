const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerLocalGuideService } = require('./_managerLocalGuideTestHelper');

test('UTCID01: createLocalGuide creates a local guide successfully with normalized email and default fields', async () => {
  const createdAt = new Date('2026-03-26T10:00:00.000Z');
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: {
        id: 'site-1',
        code: 'CHNAM001',
        name: 'Holy Church',
      },
    }),
    userFindOne: async () => null,
    userCreate: async (data) => ({
      id: 'guide-id',
      email: data.email,
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
      status: data.status,
      created_at: createdAt,
    }),
  });

  ManagerLocalGuideService.generatePassword = () => 'GeneratedPass1!';

  const result = await ManagerLocalGuideService.createLocalGuide('manager-id', {
    email: '  GUIDE@EXAMPLE.COM  ',
    full_name: '  Local Guide  ',
    phone: ' 0901234567 ',
  });

  assert.equal(result.id, 'guide-id');
  assert.equal(result.email, 'guide@example.com');
  assert.equal(result.full_name, 'Local Guide');
  assert.equal(result.phone, '0901234567');
  assert.equal(result.role, 'local_guide');
  assert.equal(result.status, 'active');
  assert.equal(result.site.id, 'site-1');
  assert.deepEqual(state.userCreateCalls[0], {
    email: 'guide@example.com',
    password_hash: 'hashed-GeneratedPass1!',
    full_name: 'Local Guide',
    phone: '0901234567',
    role: 'local_guide',
    site_id: 'site-1',
    status: 'active',
    language: 'vi',
  });
  assert.deepEqual(state.bcryptHashCalls[0], {
    plainText: 'GeneratedPass1!',
    saltRounds: 10,
  });
  assert.equal(state.emailCredentialCalls.length, 1);
});

test('UTCID02: createLocalGuide rejects when manager is not found', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerLocalGuideService.createLocalGuide('missing-manager-id', {
      email: 'guide@example.com',
      full_name: 'Local Guide',
    }),
    { message: 'Manager not found' }
  );
});

test('UTCID03: createLocalGuide rejects when user is not a manager', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.createLocalGuide('pilgrim-id', {
      email: 'guide@example.com',
      full_name: 'Local Guide',
    }),
    { message: 'Only managers can create local guides' }
  );
});

test('UTCID04: createLocalGuide rejects when manager has no site', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.createLocalGuide('manager-id', {
      email: 'guide@example.com',
      full_name: 'Local Guide',
    }),
    { message: 'Manager has no site' }
  );
});

test('UTCID05: createLocalGuide rejects when email already exists', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', code: 'CHNAM001', name: 'Holy Church' },
    }),
    userFindOne: async () => ({
      id: 'existing-user-id',
      email: 'guide@example.com',
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.createLocalGuide('manager-id', {
      email: 'guide@example.com',
      full_name: 'Local Guide',
    }),
    { message: 'Email already exists' }
  );
});

test('UTCID06: createLocalGuide still succeeds when credentials email sending fails', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', code: 'CHNAM001', name: 'Holy Church' },
    }),
    userFindOne: async () => null,
    sendLocalGuideCredentials: async () => {
      throw new Error('SMTP failed');
    },
  });

  ManagerLocalGuideService.generatePassword = () => 'GeneratedPass1!';

  const result = await ManagerLocalGuideService.createLocalGuide('manager-id', {
    email: 'guide@example.com',
    full_name: 'Local Guide',
  });

  assert.equal(result.email, 'guide@example.com');
  assert.equal(state.emailCredentialCalls.length, 1);
  assert.ok(state.errorLogs.some((entry) => String(entry[0]).includes('Failed to send Local Guide credentials email:')));
});
