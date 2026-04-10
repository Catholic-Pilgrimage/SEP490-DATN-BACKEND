const test = require('node:test');
const assert = require('node:assert/strict');

const { loadAdminVerificationService } = require('./_verificationTestHelper');

test('UTCID01: getRequestById returns detail for a regular verification request', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => ({
      id: 'request-id',
      code: 'VR03271',
      site_name: 'Holy Church',
      site_address: '123 Street',
      site_province: 'Da Nang',
      site_type: 'church',
      site_region: 'Central',
      certificate_url: 'https://example.com/certificate.pdf',
      introduction: 'Regular intro',
      status: 'pending',
      rejection_reason: null,
      verified_at: null,
      created_at: new Date('2026-03-26T00:00:00.000Z'),
      updated_at: new Date('2026-03-26T00:00:00.000Z'),
      existing_site_id: null,
      transition_reason: null,
      user_id: 'pilgrim-id',
      applicant: {
        id: 'pilgrim-id',
        full_name: 'Pilgrim User',
        email: 'pilgrim@example.com',
        phone: '0901000001',
        avatar_url: 'https://example.com/avatar.png',
      },
      reviewer: {
        id: 'admin-id',
        full_name: 'Admin User',
        email: 'admin@example.com',
      },
    }),
  });

  const result = await AdminVerificationService.getRequestById('request-id');

  assert.equal(result.code, 'VR03271');
  assert.equal(result.applicant.full_name, 'Pilgrim User');
  assert.equal(result.reviewer.email, 'admin@example.com');
  assert.equal(result.is_transition, false);
  assert.equal(state.siteFindByPkCalls.length, 0);
});

test('UTCID02: getRequestById returns old manager and existing site for transition request', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => ({
      id: 'transition-request-id',
      code: 'VR03272',
      site_name: 'Holy Church',
      site_address: '123 Street',
      site_province: 'Da Nang',
      site_type: 'church',
      site_region: 'Central',
      certificate_url: 'https://example.com/certificate.pdf',
      introduction: 'Transition intro',
      status: 'pending',
      rejection_reason: null,
      verified_at: null,
      created_at: new Date('2026-03-26T00:00:00.000Z'),
      updated_at: new Date('2026-03-26T00:00:00.000Z'),
      existing_site_id: 'site-1',
      transition_reason: 'Manager handover',
      user_id: 'pilgrim-id',
      applicant: {
        id: 'pilgrim-id',
        full_name: 'Pilgrim User',
        email: 'pilgrim@example.com',
        phone: '0901000001',
        avatar_url: null,
      },
      reviewer: {
        id: 'admin-id',
        full_name: 'Admin User',
        email: 'admin@example.com',
      },
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      name: 'Holy Church',
      code: 'CHN-001',
      siteStaff: [
        {
          id: 'old-manager-id',
          full_name: 'Old Manager',
          email: 'old-manager@example.com',
          phone: '0902000002',
        },
      ],
    }),
  });

  const result = await AdminVerificationService.getRequestById('transition-request-id');

  assert.equal(result.is_transition, true);
  assert.equal(result.existing_site.id, 'site-1');
  assert.equal(result.old_manager.email, 'old-manager@example.com');
  assert.equal(state.siteFindByPkCalls.length, 1);
});

test('UTCID03: getRequestById rejects when request does not exist', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => null,
  });

  await assert.rejects(
    AdminVerificationService.getRequestById('missing-request-id'),
    { message: 'Verification request not found' }
  );

  assert.equal(state.siteFindByPkCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
});

test('UTCID04: getRequestById maps guest applicant fields when request belongs to guest', async () => {
  const { AdminVerificationService } = loadAdminVerificationService({
    verificationRequestFindByPk: async () => ({
      id: 'guest-request-id',
      code: 'VR03273',
      site_name: 'Holy Church',
      site_address: '123 Street',
      site_province: 'Da Nang',
      site_type: 'church',
      site_region: 'Central',
      certificate_url: null,
      introduction: null,
      status: 'pending',
      rejection_reason: null,
      verified_at: null,
      created_at: new Date('2026-03-26T00:00:00.000Z'),
      updated_at: new Date('2026-03-26T00:00:00.000Z'),
      existing_site_id: null,
      transition_reason: null,
      user_id: null,
      applicant_email: 'guest@example.com',
      applicant_name: 'Guest User',
      applicant_phone: '0901000001',
      applicant: null,
      reviewer: null,
    }),
  });

  const result = await AdminVerificationService.getRequestById('guest-request-id');

  assert.deepEqual(result.applicant, {
    email: 'guest@example.com',
    full_name: 'Guest User',
    phone: '0901000001',
    is_guest: true,
  });
});
