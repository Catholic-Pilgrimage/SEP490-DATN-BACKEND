const test = require('node:test');
const assert = require('node:assert/strict');

const { Op } = require('sequelize');

const { loadAdminVerificationService } = require('./_verificationTestHelper');

test('UTCID01: getRequests returns paginated verification requests for admin review', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindAndCountAll: async () => ({
      rows: [
        {
          id: 'request-id',
          code: 'VR03261',
          site_name: 'Holy Church',
          site_address: '123 Street',
          site_province: 'Da Nang',
          site_type: 'church',
          site_region: 'Central',
          certificate_url: 'https://example.com/certificate.pdf',
          introduction: 'Pilgrim introduction',
          status: 'pending',
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          existing_site_id: null,
          transition_reason: null,
          user_id: 'pilgrim-id',
          applicant: {
            id: 'pilgrim-id',
            full_name: 'Pilgrim User',
            email: 'pilgrim@example.com',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      ],
      count: 1,
    }),
  });

  const result = await AdminVerificationService.getRequests({ page: 1, limit: 10 });

  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].code, 'VR03261');
  assert.equal(result.requests[0].applicant.full_name, 'Pilgrim User');
  assert.equal(result.requests[0].is_transition, false);
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.total, 1);
  assert.equal(result.pagination.totalPages, 1);
  assert.deepEqual(state.verificationRequestFindAndCountAllCalls[0].order, [['created_at', 'DESC']]);
});

test('UTCID02: getRequests applies status filter and pagination correctly', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindAndCountAll: async () => ({ rows: [], count: 0 }),
  });

  await AdminVerificationService.getRequests({ page: 2, limit: 5, status: 'approved' });

  const query = state.verificationRequestFindAndCountAllCalls[0];
  assert.equal(query.where.status, 'approved');
  assert.equal(query.limit, 5);
  assert.equal(query.offset, 5);
});

test('UTCID03: getRequests applies search filter across code, site, and applicant fields', async () => {
  const { AdminVerificationService, state } = loadAdminVerificationService({
    verificationRequestFindAndCountAll: async () => ({ rows: [], count: 0 }),
  });

  await AdminVerificationService.getRequests({ search: 'holy' });

  const query = state.verificationRequestFindAndCountAllCalls[0];
  assert.equal(query.where[Op.or].length, 4);
  assert.equal(query.where[Op.or][0].code[Op.iLike], '%holy%');
  assert.equal(query.where[Op.or][1].site_name[Op.iLike], '%holy%');
  assert.equal(query.where[Op.or][2].applicant_email[Op.iLike], '%holy%');
  assert.equal(query.where[Op.or][3].applicant_name[Op.iLike], '%holy%');
});

test('UTCID04: getRequests maps guest applicant data when request has no user_id', async () => {
  const { AdminVerificationService } = loadAdminVerificationService({
    verificationRequestFindAndCountAll: async () => ({
      rows: [
        {
          id: 'guest-request-id',
          code: 'VR03262',
          site_name: 'Pilgrimage Site',
          site_address: '456 Street',
          site_province: 'Hue',
          site_type: 'shrine',
          site_region: 'Central',
          certificate_url: null,
          introduction: null,
          status: 'pending',
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          existing_site_id: null,
          transition_reason: null,
          user_id: null,
          applicant_email: 'guest@example.com',
          applicant_name: 'Guest User',
          applicant_phone: '0901000001',
          applicant: null,
        },
      ],
      count: 1,
    }),
  });

  const result = await AdminVerificationService.getRequests();

  assert.deepEqual(result.requests[0].applicant, {
    email: 'guest@example.com',
    full_name: 'Guest User',
    phone: '0901000001',
    is_guest: true,
  });
});

test('UTCID05: getRequests returns transition request flags and reason', async () => {
  const { AdminVerificationService } = loadAdminVerificationService({
    verificationRequestFindAndCountAll: async () => ({
      rows: [
        {
          id: 'transition-request-id',
          code: 'VR03263',
          site_name: 'Holy Church',
          site_address: '789 Street',
          site_province: 'Da Nang',
          site_type: 'church',
          site_region: 'Central',
          certificate_url: 'https://example.com/certificate.pdf',
          introduction: 'Transition intro',
          status: 'pending',
          created_at: new Date('2026-03-26T00:00:00.000Z'),
          existing_site_id: 'site-1',
          transition_reason: 'Manager handover',
          user_id: 'pilgrim-id',
          applicant: {
            id: 'pilgrim-id',
            full_name: 'Pilgrim User',
            email: 'pilgrim@example.com',
            avatar_url: null,
          },
        },
      ],
      count: 1,
    }),
  });

  const result = await AdminVerificationService.getRequests();

  assert.equal(result.requests[0].is_transition, true);
  assert.equal(result.requests[0].existing_site_id, 'site-1');
  assert.equal(result.requests[0].transition_reason, 'Manager handover');
});
