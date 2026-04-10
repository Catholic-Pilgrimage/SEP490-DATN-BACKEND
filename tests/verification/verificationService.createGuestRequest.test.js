const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimVerificationService } = require('./_verificationTestHelper');

test('UTCID01: createGuestRequest succeeds with valid guest data', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindOne: async () => null,
    verificationRequestFindOne: async (query) => {
      if (query.where?.applicant_email) return null;
      if (query.where?.code) return null;
      return null;
    },
  });

  const result = await PilgrimVerificationService.createGuestRequest({
    applicant_email: 'guest@example.com',
    applicant_name: 'Guest User',
    applicant_phone: '0901000001',
    site_name: 'Holy Church',
    site_province: 'Da Nang',
    site_address: '123 Street',
    site_type: 'church',
    site_region: 'Central',
    certificate_url: 'https://example.com/certificate.pdf',
    introduction: 'Guest introduction',
  });

  assert.equal(result.applicant_email, 'guest@example.com');
  assert.equal(result.applicant_name, 'Guest User');
  assert.equal(result.site_name, 'Holy Church');
  assert.equal(result.status, 'pending');
  assert.equal(state.verificationRequestCreateCalls.length, 1);
  assert.equal(state.verificationRequestCreateCalls[0].user_id, null);
  assert.equal(state.verificationRequestCreateCalls[0].applicant_email, 'guest@example.com');
  assert.equal(state.verificationRequestCreateCalls[0].status, 'pending');
  assert.equal(state.notifyAllAdminsCalls.length, 1);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: createGuestRequest normalizes guest email before saving', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindOne: async () => null,
    verificationRequestFindOne: async () => null,
  });

  await PilgrimVerificationService.createGuestRequest({
    applicant_email: '  GUEST@EXAMPLE.COM  ',
    applicant_name: 'Guest User',
    site_name: 'Holy Church',
    site_province: 'Da Nang',
  });

  assert.equal(state.verificationRequestCreateCalls[0].applicant_email, 'guest@example.com');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: createGuestRequest rejects when applicant email or name is missing', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService();

  await assert.rejects(
    PilgrimVerificationService.createGuestRequest({
      applicant_email: 'guest@example.com',
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'Email and name are required' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.notifyAllAdminsCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: createGuestRequest rejects when site name or province is missing', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService();

  await assert.rejects(
    PilgrimVerificationService.createGuestRequest({
      applicant_email: 'guest@example.com',
      applicant_name: 'Guest User',
      site_name: 'Holy Church',
    }),
    { message: 'Site name and province are required' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: createGuestRequest rejects when email is already registered', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindOne: async () => ({ id: 'existing-user-id' }),
  });

  await assert.rejects(
    PilgrimVerificationService.createGuestRequest({
      applicant_email: 'registered@example.com',
      applicant_name: 'Guest User',
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'Email already registered. Please login and submit verification request.' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID06: createGuestRequest rejects when guest already has a pending request', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    userFindOne: async () => null,
    verificationRequestFindOne: async (query) => {
      if (query.where?.applicant_email) {
        return { id: 'pending-request-id', status: 'pending' };
      }
      return null;
    },
  });

  await assert.rejects(
    PilgrimVerificationService.createGuestRequest({
      applicant_email: 'guest@example.com',
      applicant_name: 'Guest User',
      site_name: 'Holy Church',
      site_province: 'Da Nang',
    }),
    { message: 'You already have a pending verification request with this email' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
