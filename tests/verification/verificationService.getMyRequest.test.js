const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPilgrimVerificationService } = require('./_verificationTestHelper');

test('UTCID01: getMyRequest returns the latest verification request for a pilgrim', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    verificationRequestFindOne: async () => ({
      id: 'request-id',
      code: 'VR03261',
      site_name: 'Holy Church',
      site_address: '123 Street',
      site_province: 'Da Nang',
      site_type: 'church',
      site_region: 'Central',
      certificate_url: 'https://example.com/certificate.pdf',
      introduction: 'Intro',
      status: 'pending',
      rejection_reason: null,
      verified_at: null,
      created_at: new Date('2026-03-26T00:00:00.000Z'),
    }),
  });

  const result = await PilgrimVerificationService.getMyRequest('pilgrim-id');

  assert.equal(result.id, 'request-id');
  assert.equal(result.code, 'VR03261');
  assert.equal(result.site_name, 'Holy Church');
  assert.equal(result.status, 'pending');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID02: getMyRequest returns null when pilgrim has no verification request', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    verificationRequestFindOne: async () => null,
  });

  const result = await PilgrimVerificationService.getMyRequest('pilgrim-id');

  assert.equal(result, null);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: getMyRequest searches by user and orders by newest request first', async () => {
  const { PilgrimVerificationService, state } = loadPilgrimVerificationService({
    verificationRequestFindOne: async () => ({
      id: 'latest-request-id',
      code: 'VR03262',
      site_name: 'Latest Church',
      status: 'approved',
      created_at: new Date('2026-03-26T00:00:00.000Z'),
    }),
  });

  await PilgrimVerificationService.getMyRequest('pilgrim-id');

  assert.deepEqual(state.verificationRequestFindOneCalls[0], {
    where: { user_id: 'pilgrim-id' },
    order: [['created_at', 'DESC']],
  });
});
