const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerSiteService } = require('./_managerSiteTestHelper');

test('UTCID01: getManagerSite returns formatted site detail with creator info', async () => {
  const createdAt = new Date('2026-03-26T08:00:00.000Z');
  const updatedAt = new Date('2026-03-26T09:00:00.000Z');

  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async (userId) => {
      if (userId === 'manager-id') {
        return {
          id: 'manager-id',
          role: 'manager',
          site_id: 'site-1',
        };
      }

      return {
        id: 'creator-id',
        full_name: 'Creator User',
        email: 'creator@example.com',
      };
    },
    siteFindByPk: async () => ({
      id: 'site-1',
      code: 'CHNAM001',
      name: 'Holy Church',
      description: 'Historic site',
      history: 'Founded long ago',
      address: '123 Faith Street',
      province: 'Da Nang',
      district: 'Hai Chau',
      latitude: 16.0544,
      longitude: 108.2022,
      region: 'Nam',
      type: 'church',
      patron_saint: 'Saint Joseph',
      cover_image: 'https://example.com/cover.jpg',
      opening_hours: '06:00-18:00',
      contact_info: '0901234567',
      is_active: true,
      created_by: 'creator-id',
      created_at: createdAt,
      updated_at: updatedAt,
    }),
  });

  const result = await ManagerSiteService.getManagerSite('manager-id');

  assert.equal(result.id, 'site-1');
  assert.equal(result.code, 'CHNAM001');
  assert.equal(result.name, 'Holy Church');
  assert.equal(result.created_by.id, 'creator-id');
  assert.equal(result.created_by.email, 'creator@example.com');
});

test('UTCID02: getManagerSite rejects when manager is not found', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerSiteService.getManagerSite('missing-manager-id'),
    { message: 'Manager not found' }
  );
});

test('UTCID03: getManagerSite rejects when manager has no site assigned', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerSiteService.getManagerSite('manager-id'),
    { message: 'Manager has no site' }
  );
});

test('UTCID04: getManagerSite rejects when assigned site does not exist', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerSiteService.getManagerSite('manager-id'),
    { message: 'Site not found' }
  );
});
