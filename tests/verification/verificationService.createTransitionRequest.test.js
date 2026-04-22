const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimVerificationService } = require('./_verificationTestHelper');

test('UTCID01: createTransitionRequest succeeds for a pilgrim with valid existing site', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-1',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async (query) => {
      if (query.where?.role === 'manager') {
        return { id: 'manager-1', full_name: 'Current Manager', status: 'active' };
      }
      return null;
    },
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      full_name: 'Pilgrim User',
    }),
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
    existing_site_id: 'site-1',
    transition_reason: 'I will take over management',
    certificate_url: 'https://example.com/certificate.pdf',
  });

  assert.equal(result.existing_site.id, 'site-1');
  assert.equal(result.existing_site.current_manager.id, 'manager-1');
  assert.equal(result.status, 'pending');
  assert.equal(state.verificationRequestCreateCalls.length, 1);
  assert.equal(state.verificationRequestCreateCalls[0].user_id, 'pilgrim-id');
  assert.equal(state.notifyAllAdminsCalls.length, 1);
});

test('UTCID02: createTransitionRequest succeeds for a guest with valid data', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-2',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async (query) => {
      if (query.where?.role === 'manager') {
        return { id: 'manager-2', full_name: 'Current Manager', status: 'active' };
      }
      if (query.where?.email) {
        return null;
      }
      return null;
    },
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.createTransitionRequest(null, {
    applicant_email: 'guest@example.com',
    applicant_name: 'Guest User',
    applicant_phone: '0901000001',
    existing_site_id: 'site-2',
    transition_reason: 'I am the successor',
  });

  assert.equal(result.existing_site.id, 'site-2');
  assert.equal(state.verificationRequestCreateCalls[0].applicant_email, 'guest@example.com');
  assert.equal(state.verificationRequestCreateCalls[0].user_id, null);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: createTransitionRequest rejects when existing_site_id is missing', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService();

  await assert.rejects(
    PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
      transition_reason: 'Take over management',
    }),
    { message: 'existing_site_id is required' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: createTransitionRequest rejects when site is not found or inactive', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
      existing_site_id: 'missing-site',
      transition_reason: 'Take over management',
    }),
    { message: 'Site not found' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID05: createTransitionRequest allows claim flow when the site has no current manager', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-5',
      is_active: true,
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async () => null,
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      full_name: 'Pilgrim User',
    }),
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
    existing_site_id: 'site-5',
    transition_reason: 'Take over management',
  });

  assert.equal(result.claim_type, 'unassigned');
  assert.equal(result.existing_site.current_manager, null);
  assert.equal(state.verificationRequestCreateCalls.length, 1);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID06: createTransitionRequest rejects guest request when applicant email or name is missing', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-6',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async () => ({ id: 'manager-6', full_name: 'Current Manager', status: 'active' }),
  });

  await assert.rejects(
    PilgrimVerificationService.createTransitionRequest(null, {
      existing_site_id: 'site-6',
      transition_reason: 'Take over management',
    }),
    { message: 'applicant_email and applicant_name are required for guest' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID07: createTransitionRequest rejects guest request when email is already registered', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-7',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async (query) => {
      if (query.where?.role === 'manager') {
        return { id: 'manager-7', full_name: 'Current Manager', status: 'active' };
      }
      if (query.where?.email) {
        return { id: 'existing-user-id' };
      }
      return null;
    },
  });

  await assert.rejects(
    PilgrimVerificationService.createTransitionRequest(null, {
      applicant_email: 'registered@example.com',
      applicant_name: 'Guest User',
      existing_site_id: 'site-7',
      transition_reason: 'Take over management',
    }),
    { message: 'Email already registered. Please login first.' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID08: createTransitionRequest rejects when the site already has a pending transition request', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-8',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async () => ({ id: 'manager-8', full_name: 'Current Manager', status: 'active' }),
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
    }),
    verificationRequestFindOne: async (query) => {
      if (query.where?.user_id) return null;
      if (query.where?.existing_site_id) return { id: 'pending-transition-id', status: 'pending' };
      return null;
    },
  });

  await assert.rejects(
    PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
      existing_site_id: 'site-8',
      transition_reason: 'Take over management',
    }),
    { message: 'This site already has a pending transition request' }
  );

  assert.equal(state.verificationRequestCreateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID09: createTransitionRequest allows missing transition reason when creating request', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    siteFindOne: async () => ({
      id: 'site-9',
      name: 'Holy Church',
      address: '123 Street',
      province: 'Da Nang',
      type: 'church',
      region: 'Central',
    }),
    userFindOne: async () => ({ id: 'manager-9', full_name: 'Current Manager', status: 'active' }),
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
    }),
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.createTransitionRequest('pilgrim-id', {
    existing_site_id: 'site-9',
  });

  assert.equal(result.status, 'pending');
  assert.equal(result.transition_reason, undefined);
  assert.equal(state.verificationRequestCreateCalls.length, 1);
  assert.equal(state.errorLogs.length, 0);
});
