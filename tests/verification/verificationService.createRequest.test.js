const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimVerificationService } = require('./_verificationTestHelper');

test('UTCID01: createRequest succeeds for an authenticated pilgrim', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      full_name: 'Pilgrim User',
      email: 'pilgrim@example.com',
    }),
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.createRequest('pilgrim-id', {
    site_name: 'Holy Church',
    site_address: '123 Street',
    site_province: 'Da Nang',
    site_type: 'church',
    site_region: 'Central',
    certificate_url: 'https://example.com/certificate.pdf',
    introduction: 'Pilgrim introduction',
  });

  assert.equal(result.site_name, 'Holy Church');
  assert.equal(result.status, 'pending');
  assert.equal(state.verificationRequestCreateCalls.length, 1);
  assert.equal(state.verificationRequestCreateCalls[0].user_id, 'pilgrim-id');
  assert.equal(state.notifyAllAdminsCalls.length, 1);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: createRequest rejects when user does not exist', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    PilgrimVerificationService.createRequest('missing-user-id', {
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'User not found' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID03: createRequest rejects when authenticated user is not a pilgrim', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
    }),
  });

  await assert.rejects(
    PilgrimVerificationService.createRequest('manager-id', {
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'Only pilgrims can submit verification requests' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: createRequest rejects when pilgrim already has a pending request', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
    }),
    verificationRequestFindOne: async (query) => {
      if (query.where?.user_id) {
        return { id: 'pending-request-id', status: 'pending' };
      }
      return null;
    },
  });

  await assert.rejects(
    PilgrimVerificationService.createRequest('pilgrim-id', {
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'You already have a pending verification request' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: createRequest stores optional certificate and introduction fields', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      full_name: 'Pilgrim User',
      email: 'pilgrim@example.com',
    }),
    verificationRequestFindOne: async () => null,
  });

  await PilgrimVerificationService.createRequest('pilgrim-id', {
    site_name: 'Holy Church',
    site_address: '123 Street',
    site_province: 'Da Nang',
    certificate_url: 'https://example.com/certificate.pdf',
    introduction: 'Detailed introduction',
  });

  assert.equal(state.verificationRequestCreateCalls[0].certificate_url, 'https://example.com/certificate.pdf');
  assert.equal(state.verificationRequestCreateCalls[0].introduction, 'Detailed introduction');
  assert.equal(state.errorLogs.length, 0);
});
