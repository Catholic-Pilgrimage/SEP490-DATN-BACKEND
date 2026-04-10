const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideSiteService } = require('./_localGuideTestHelper');

test('UTCID01: getMySite returns assigned site details for local guide', async () => {
  const { LocalGuideSiteService } = loadLocalGuideSiteService({
    userFindByPk: async (userId) => ({
      id: userId,
      role: 'local_guide',
      site_id: 'site-1',
      assignedSite: {
        id: 'site-1',
        code: 'CHNAM001',
        name: 'Holy Church',
        description: 'Historic site',
        history: 'Long history',
        address: '123 Faith Street',
        province: 'Da Nang',
        district: 'Hai Chau',
        latitude: 16.0471,
        longitude: 108.2068,
        region: 'Nam',
        type: 'church',
        patron_saint: 'Saint Joseph',
        cover_image: 'https://example.com/cover.jpg',
        opening_hours: '06:00-18:00',
        contact_info: '0123456789',
        is_active: true,
        created_at: new Date('2026-03-26T00:00:00.000Z'),
        updated_at: new Date('2026-03-26T00:00:00.000Z'),
      },
    }),
  });

  const result = await LocalGuideSiteService.getMySite('guide-id');

  assert.equal(result.id, 'site-1');
  assert.equal(result.code, 'CHNAM001');
  assert.equal(result.name, 'Holy Church');
  assert.equal(result.province, 'Da Nang');
  assert.equal(result.contact_info, '0123456789');
});

test('UTCID02: getMySite rejects when user is not found', async () => {
  const { LocalGuideSiteService } = loadLocalGuideSiteService();

  await assert.rejects(
    LocalGuideSiteService.getMySite('missing-user-id'),
    { message: 'User not found' }
  );
});

test('UTCID03: getMySite rejects when user is not a local guide', async () => {
  const { LocalGuideSiteService } = loadLocalGuideSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1' },
    }),
  });

  await assert.rejects(
    LocalGuideSiteService.getMySite('manager-id'),
    { message: 'Only local guides can access this' }
  );
});

test('UTCID04: getMySite rejects when local guide has no assigned site', async () => {
  const { LocalGuideSiteService } = loadLocalGuideSiteService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: null,
      assignedSite: null,
    }),
  });

  await assert.rejects(
    LocalGuideSiteService.getMySite('guide-id'),
    { message: 'Local Guide has no site assigned' }
  );
});
