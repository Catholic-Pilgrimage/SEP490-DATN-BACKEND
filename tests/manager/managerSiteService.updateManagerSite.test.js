const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerSiteService } = require('./_managerSiteTestHelper');

test('UTCID01: updateManagerSite updates allowed fields, trims strings, and notifies favorite users', async () => {
  let updatedData = null;
  const site = {
    id: 'site-1',
    code: 'CHNAM001',
    name: 'Old Church',
    description: 'Old description',
    history: 'Old history',
    address: 'Old address',
    province: 'Da Nang',
    district: 'Hai Chau',
    latitude: null,
    longitude: null,
    region: 'Nam',
    type: 'church',
    patron_saint: 'Old Saint',
    cover_image: null,
    opening_hours: '06:00-17:00',
    contact_info: '0901',
    is_active: false,
    created_by: 'creator-id',
    created_at: new Date('2026-03-26T08:00:00.000Z'),
    updated_at: new Date('2026-03-26T08:00:00.000Z'),
    update: async function (data) {
      updatedData = data;
      Object.assign(this, data);
      return this;
    },
  };

  const { ManagerSiteService, state } = loadManagerSiteService({
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
    siteFindByPk: async () => site,
    siteFindOne: async () => null,
  });

  const result = await ManagerSiteService.updateManagerSite('manager-id', {
    name: '  New Church Name  ',
    address: '  456 New Address  ',
    opening_hours: '07:00-18:00',
    contact_info: '0987654321',
    region: 'Bac',
    is_active: true,
  });

  assert.deepEqual(updatedData, {
    name: 'New Church Name',
    address: '456 New Address',
    opening_hours: '07:00-18:00',
    contact_info: '0987654321',
  });
  assert.equal(result.name, 'New Church Name');
  assert.equal(result.address, '456 New Address');
  assert.equal(state.notificationCalls.length, 1);
  assert.equal(state.notificationCalls[0][0], 'site-1');
});

test('UTCID02: updateManagerSite rejects duplicate site name and province', async () => {
  const site = {
    id: 'site-1',
    name: 'Old Church',
    province: 'Da Nang',
    created_by: 'creator-id',
    update: async () => {
      throw new Error('update should not be called');
    },
  };

  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => site,
    siteFindOne: async () => ({
      id: 'duplicate-site',
      name: 'Holy Church',
      province: 'Hue',
    }),
  });

  await assert.rejects(
    ManagerSiteService.updateManagerSite('manager-id', {
      name: 'Holy Church',
      province: 'Hue',
    }),
    { message: 'Site already exists' }
  );
});

test('UTCID03: updateManagerSite rejects when manager is not found', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerSiteService.updateManagerSite('missing-manager-id', {
      description: 'Updated',
    }),
    { message: 'Manager not found' }
  );
});

test('UTCID04: updateManagerSite rejects when manager has no site assigned', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerSiteService.updateManagerSite('manager-id', {
      description: 'Updated',
    }),
    { message: 'Manager has no site' }
  );
});

test('UTCID05: updateManagerSite rejects when assigned site does not exist', async () => {
  const { ManagerSiteService } = loadManagerSiteService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerSiteService.updateManagerSite('manager-id', {
      description: 'Updated',
    }),
    { message: 'Site not found' }
  );
});

test('UTCID06: updateManagerSite ignores disallowed fields and skips favorite notification for non-important changes', async () => {
  let updatedData = null;
  const site = {
    id: 'site-1',
    code: 'CHNAM001',
    name: 'Old Church',
    province: 'Da Nang',
    created_by: 'creator-id',
    update: async function (data) {
      updatedData = data;
      Object.assign(this, data);
      return this;
    },
  };

  const { ManagerSiteService, state } = loadManagerSiteService({
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
    siteFindByPk: async () => site,
    siteFindOne: async () => null,
  });

  await ManagerSiteService.updateManagerSite('manager-id', {
    description: 'New description',
    status: 'active',
    is_active: true,
    region: 'Bac',
  });

  assert.deepEqual(updatedData, {
    description: 'New description',
  });
  assert.equal(state.notificationCalls.length, 0);
});
