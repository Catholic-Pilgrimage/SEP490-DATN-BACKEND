const test = require('node:test');
const assert = require('node:assert/strict');

const { loadAdminVerificationService } = require('./_verificationTestHelper');

function createRejectableRequest(overrides = {}) {
  const request = {
    id: 'request-id',
    code: 'VR03291',
    status: 'pending',
    user_id: 'pilgrim-id',
    applicant_email: null,
    applicant_name: null,
    applicant_phone: null,
    rejection_reason: null,
    updateCalls: [],
    async update(payload) {
      this.updateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };

  return Object.assign(request, overrides);
}

test('UTCID01: rejectRequest rejects pilgrim request successfully', async () => {
  const request = createRejectableRequest();
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      email: 'pilgrim@example.com',
      full_name: 'Pilgrim User',
    }),
  });

  const result = await AdminVerificationService.rejectRequest('request-id', 'admin-id', 'Need more evidence');

  assert.equal(result.status, 'rejected');
  assert.equal(result.rejection_reason, 'Need more evidence');
  assert.equal(request.updateCalls.length, 1);
  assert.equal(request.updateCalls[0].status, 'rejected');
  assert.equal(state.emailCalls.sendVerificationRejected.length, 1);
  assert.equal(state.emailCalls.sendVerificationRejected[0][0], 'pilgrim@example.com');
});

test('UTCID02: rejectRequest rejects guest request successfully', async () => {
  const request = createRejectableRequest({
    id: 'guest-request-id',
    code: 'VR03292',
    user_id: null,
    applicant_email: 'guest@example.com',
    applicant_name: 'Guest User',
    applicant_phone: '0901000001',
  });
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  const result = await AdminVerificationService.rejectRequest('guest-request-id', 'admin-id', 'Missing certificate');

  assert.equal(result.status, 'rejected');
  assert.equal(state.emailCalls.sendVerificationRejected.length, 1);
  assert.equal(state.emailCalls.sendVerificationRejected[0][0], 'guest@example.com');
  assert.equal(state.emailCalls.sendVerificationRejected[0][1], 'Guest User');
});

test('UTCID03: rejectRequest rejects when request does not exist', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => null,
  });

  await assert.rejects(
    AdminVerificationService.rejectRequest('missing-request-id', 'admin-id', 'Need more evidence'),
    { message: 'Verification request not found' }
  );

  assert.equal(state.emailCalls.sendVerificationRejected.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: rejectRequest rejects when request is not pending', async () => {
  const request = createRejectableRequest({ status: 'approved' });
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  await assert.rejects(
    AdminVerificationService.rejectRequest('request-id', 'admin-id', 'Need more evidence'),
    { message: 'Request is not pending' }
  );

  assert.equal(state.emailCalls.sendVerificationRejected.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: rejectRequest rejects when rejection reason is missing', async () => {
  const request = createRejectableRequest();
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  await assert.rejects(
    AdminVerificationService.rejectRequest('request-id', 'admin-id', ''),
    { message: 'Rejection reason is required' }
  );

  assert.equal(request.updateCalls.length, 0);
  assert.equal(state.emailCalls.sendVerificationRejected.length, 0);
  assert.equal(state.errorLogs.length, 1);
});
