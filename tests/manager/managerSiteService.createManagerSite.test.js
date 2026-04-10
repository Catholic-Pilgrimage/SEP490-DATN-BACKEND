const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerSiteService } = require('./_managerSiteTestHelper');

test('UTCID01: createManagerSite creates a new site successfully with explicit site data', async () => {
  const createdAt = new Date('2026-03-26T08:00:00.000Z');
  const updatedAt = new Date('2026-03-26T08:00:00.000Z');
  const { ManagerSiteService, state } = loadManagerSiteService({
    userFindByPk: async (userId) => ({
      id: userId,
      email: 'manager@example.com',
      full_name: 'Site Manager',
      role: 'manager',
      site_id: null,
    }),
    siteCreate: async (data) => ({
      id: 'site-1',
      code: data.code,
      name: data.name,
      description: data.description,
      history: data.history || null,
      address: data.address,
      province: data.province,
      district: data.district || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      region: data.region,
      type: data.type,
      patron_saint: data.patron_saint || null,
      cover_image: data.cover_image || null,
      opening_hours: data.opening_hours || null,
      contact_info: data.contact_info || null,
      is_active: data.is_active,
      created_by: data.created_by,
      created_at: createdAt,
      updated_at: updatedAt,
    }),
  });

  ManagerSiteService.generateSiteCode = async () => 'CHNAM001';

  const result = await ManagerSiteService.createManagerSite('manager-id', {
    name: '  Holy Church  ',
    province: '  Da Nang  ',
    address: '123 Faith Street',
    type: 'church',
    region: 'Nam',
    description: 'A historic church',
  });

  assert.equal(result.id, 'site-1');
  assert.equal(result.code, 'CHNAM001');
  assert.equal(result.name, 'Holy Church');
  assert.equal(result.province, 'Da Nang');
  assert.equal(result.created_by.id, 'manager-id');
  assert.equal(result.created_by.email, 'manager@example.com');
  assert.deepEqual(state.siteCreateCalls[0], {
    code: 'CHNAM001',
    name: 'Holy Church',
    description: 'A historic church',
    history: undefined,
    address: '123 Faith Street',
    province: 'Da Nang',
    district: undefined,
    latitude: undefined,
    longitude: undefined,
    region: 'Nam',
    type: 'church',
    patron_saint: undefined,
    cover_image: undefined,
    opening_hours: undefined,
    contact_info: undefined,
    created_by: 'manager-id',
    is_active: false,
  });
  assert.deepEqual(state.userUpdateCalls[0], {
    values: { site_id: 'site-1' },
    options: { where: { id: 'manager-id' } },
  });
});

test('UTCID02: createManagerSite falls back to approved verification request site info', async () => {
  const { ManagerSiteService, state } = loadManagerSiteService({
    userFindByPk: async (userId) => ({
      id: userId,
      email: 'manager@example.com',
      full_name: 'Verified Manager',
      role: 'manager',
      site_id: null,
    }),
    verificationRequestFindOne: async () => ({
      site_name: 'Verified Church',
      site_province: 'Hue',
      site_address: '45 Holy Road',
      site_type: 'shrine',
      site_region: 'Trung',
    }),
  });

  ManagerSiteService.generateSiteCode = async () => 'SHTRUNG001';

  const result = await ManagerSiteService.createManagerSite('manager-id', {
    description: 'Imported from verification request',
  });

  assert.equal(result.name, 'Verified Church');
  assert.equal(result.province, 'Hue');
  assert.equal(result.address, '45 Holy Road');
  assert.equal(result.type, 'shrine');
  assert.equal(result.region, 'Trung');
  assert.equal(state.siteCreateCalls[0].name, 'Verified Church');
  assert.equal(state.siteCreateCalls[0].province, 'Hue');
});

test('UTCID03: createManagerSite rejects when the user is not a manager', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'pilgrim-id',
      role: 'pilgrim',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerSiteService.createManagerSite('pilgrim-id', {
      name: 'Holy Church',
      province: 'Da Nang',
    }),
    { message: 'Only managers can create sites' }
  );
});

test('UTCID04: createManagerSite rejects when manager already has an existing site', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      email: 'manager@example.com',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      name: 'Existing Site',
    }),
  });

  await assert.rejects(
    ManagerSiteService.createManagerSite('manager-id', {
      name: 'Holy Church',
      province: 'Da Nang',
    }),
    { message: 'Manager already has a site' }
  );
});

test('UTCID05: createManagerSite rejects when required site name is missing', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      email: 'manager@example.com',
      site_id: null,
    }),
    verificationRequestFindOne: async () => null,
  });

  await assert.rejects(
    ManagerSiteService.createManagerSite('manager-id', {}),
    { message: 'Site name is required' }
  );
});

test('UTCID06: createManagerSite rejects duplicate site name and province', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      email: 'manager@example.com',
      site_id: null,
    }),
    siteFindOne: async () => ({
      id: 'duplicate-site',
      name: 'Holy Church',
      province: 'Da Nang',
    }),
  });

  await assert.rejects(
    ManagerSiteService.createManagerSite('manager-id', {
      name: 'Holy Church',
      province: 'Da Nang',
      type: 'church',
      region: 'Nam',
    }),
    { message: 'Site already exists in this province' }
  );
});
