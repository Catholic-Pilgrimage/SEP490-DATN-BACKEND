const test = require('node:test');
const assert = require('node:assert/strict');

const { loadAdminVerificationService } = require('./_verificationTestHelper');

function createPendingRequest(overrides = {}) {
  const request = {
    id: 'request-id',
    code: 'VR03281',
    status: 'pending',
    user_id: null,
    applicant_email: 'guest@example.com',
    applicant_name: 'Guest User',
    applicant_phone: '0901000001',
    site_name: 'Holy Church',
    site_address: '123 Street',
    site_province: 'Da Nang',
    site_type: 'church',
    site_region: 'Central',
    introduction: 'Verification intro',
    existing_site_id: null,
    updateCalls: [],
    async update(payload) {
      this.updateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };

  return Object.assign(request, overrides);
}

test('UTCID01: approveRequest approves guest request and creates manager account with new site', async () => {
  const request = createPendingRequest();
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  const result = await AdminVerificationService.approveRequest('request-id', 'admin-id');

  assert.equal(result.status, 'approved');
  assert.equal(result.user.role, 'manager');
  assert.equal(result.site.name, 'Holy Church');
  assert.equal(state.userCreateCalls.length, 1);
  assert.equal(state.siteCreateCalls.length, 1);
  assert.equal(state.emailCalls.sendManagerWelcome.length, 1);
  assert.equal(state.managerSiteCodeCalls.length, 1);
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
  assert.equal(request.updateCalls.length, 1);
});

test('UTCID02: approveRequest upgrades pilgrim to manager and creates new site', async () => {
  const request = createPendingRequest({
    id: 'pilgrim-request-id',
    code: 'VR03282',
    user_id: 'pilgrim-id',
    applicant_email: null,
    applicant_name: null,
    applicant_phone: null,
  });
  const pilgrimUpdateCalls = [];
  const pilgrim = {
    id: 'pilgrim-id',
    email: 'pilgrim@example.com',
    full_name: 'Pilgrim User',
    role: 'pilgrim',
    async update(payload) {
      pilgrimUpdateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };

  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
    userFindByPk: async () => pilgrim,
  });

  const result = await AdminVerificationService.approveRequest('pilgrim-request-id', 'admin-id');

  assert.equal(result.user.email, 'pilgrim@example.com');
  assert.equal(state.userCreateCalls.length, 0);
  assert.equal(state.siteCreateCalls.length, 1);
  assert.equal(state.emailCalls.sendVerificationApprovedWithSite.length, 1);
  assert.equal(pilgrimUpdateCalls.length, 2);
  assert.equal(pilgrimUpdateCalls[0].role, 'manager');
  assert.equal(typeof pilgrimUpdateCalls[1].site_id, 'string');
});

test('UTCID03: approveRequest handles transition flow and reassigns existing site ownership', async () => {
  const request = createPendingRequest({
    id: 'transition-request-id',
    code: 'VR03283',
    user_id: 'pilgrim-id',
    applicant_email: null,
    applicant_name: null,
    applicant_phone: null,
    existing_site_id: 'site-1',
  });
  const pilgrimUpdateCalls = [];
  const oldManagerUpdateCalls = [];
  const requestUpdateCalls = request.updateCalls;
  const pilgrim = {
    id: 'pilgrim-id',
    email: 'pilgrim@example.com',
    full_name: 'Pilgrim User',
    role: 'pilgrim',
    async update(payload) {
      pilgrimUpdateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };
  const oldManager = {
    id: 'old-manager-id',
    email: 'old-manager@example.com',
    full_name: 'Old Manager',
    async update(payload) {
      oldManagerUpdateCalls.push(payload);
      Object.assign(this, payload);
      return this;
    },
  };

  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
    userFindByPk: async () => pilgrim,
    siteFindByPk: async () => ({
      id: 'site-1',
      name: 'Holy Church',
      is_active: true,
    }),
    userFindOne: async (query) => {
      if (query?.where?.site_id === 'site-1') {
        return oldManager;
      }
      return null;
    },
    userFindAll: async () => [
      { id: 'guide-1' },
      { id: 'guide-2' },
    ],
  });

  const result = await AdminVerificationService.approveRequest('transition-request-id', 'admin-id');

  assert.equal(result.is_transition, true);
  assert.equal(result.site.id, 'site-1');
  assert.equal(result.old_manager.email, 'old-manager@example.com');
  assert.equal(oldManagerUpdateCalls[0].role, 'pilgrim');
  assert.equal(state.userUpdateCalls.length, 1);
  assert.equal(state.notificationCreateCalls.length, 2);
  assert.equal(state.emailCalls.sendManagerReplacedNotification.length, 1);
  assert.equal(state.emailCalls.sendTransitionApproved.length, 1);
  assert.equal(requestUpdateCalls.length, 2);
  assert.equal(requestUpdateCalls[0].old_manager_id, 'old-manager-id');
  assert.equal(requestUpdateCalls[1].status, 'approved');
  assert.equal(pilgrimUpdateCalls[pilgrimUpdateCalls.length - 1].site_id, 'site-1');
});

test('UTCID04: approveRequest rejects when verification request does not exist', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => null,
  });

  await assert.rejects(
    AdminVerificationService.approveRequest('missing-request-id', 'admin-id'),
    { message: 'Verification request not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID05: approveRequest rejects when request is not pending', async () => {
  const request = createPendingRequest({ status: 'approved' });
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  await assert.rejects(
    AdminVerificationService.approveRequest('request-id', 'admin-id'),
    { message: 'Request is not pending' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID06: approveRequest rejects when linked pilgrim user is not found', async () => {
  const request = createPendingRequest({
    user_id: 'missing-user-id',
    applicant_email: null,
    applicant_name: null,
    applicant_phone: null,
  });
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
    userFindByPk: async () => null,
  });

  await assert.rejects(
    AdminVerificationService.approveRequest('request-id', 'admin-id'),
    { message: 'User not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID07: approveRequest rejects transition request when existing site cannot be found', async () => {
  const request = createPendingRequest({
    user_id: 'pilgrim-id',
    applicant_email: null,
    applicant_name: null,
    applicant_phone: null,
    existing_site_id: 'missing-site-id',
  });
  const pilgrim = {
    id: 'pilgrim-id',
    email: 'pilgrim@example.com',
    full_name: 'Pilgrim User',
    role: 'pilgrim',
    async update(payload) {
      Object.assign(this, payload);
      return this;
    },
  };

  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
    userFindByPk: async () => pilgrim,
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    AdminVerificationService.approveRequest('request-id', 'admin-id'),
    { message: 'Existing site not found' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID08: approveRequest generates password hash and default language for guest manager account', async () => {
  const request = createPendingRequest({
    id: 'guest-request-id-2',
    code: 'VR03284',
    applicant_email: 'guest2@example.com',
    applicant_name: 'Guest Two',
    applicant_phone: '0902000002',
  });
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => request,
  });

  await AdminVerificationService.approveRequest('guest-request-id-2', 'admin-id');

  assert.equal(state.bcryptHashCalls.length, 1);
  assert.equal(state.bcryptHashCalls[0].saltRounds, 10);
  assert.equal(state.userCreateCalls[0].payload.email, 'guest2@example.com');
  assert.equal(state.userCreateCalls[0].payload.language, 'vi');
  assert.equal(state.userCreateCalls[0].payload.role, 'manager');
  assert.ok(state.userCreateCalls[0].payload.password_hash.startsWith('hashed-'));
});
