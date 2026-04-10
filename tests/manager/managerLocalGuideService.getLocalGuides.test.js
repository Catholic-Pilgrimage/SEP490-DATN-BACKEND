const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const { loadManagerLocalGuideService } = require('./_managerLocalGuideTestHelper');

test('UTCID01: getLocalGuides returns paginated local guides for manager site', async () => {
  const localGuides = [
    { id: 'guide-1', email: 'guide1@example.com', full_name: 'Guide One', phone: '0901', status: 'active' },
    { id: 'guide-2', email: 'guide2@example.com', full_name: 'Guide Two', phone: '0902', status: 'active' },
  ];

  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    userCount: async () => 2,
    userFindAll: async () => localGuides,
  });

  const result = await ManagerLocalGuideService.getLocalGuides('manager-id', { page: 1, limit: 10 });

  assert.equal(result.data.length, 2);
  assert.equal(result.pagination.totalItems, 2);
  assert.equal(result.pagination.totalPages, 1);
});

test('UTCID02: getLocalGuides applies status filter correctly', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    userCount: async () => 1,
    userFindAll: async () => [],
  });

  await ManagerLocalGuideService.getLocalGuides('manager-id', { status: 'banned', page: 2, limit: 5 });

  assert.equal(state.userCountCalls[0].where.status, 'banned');
  assert.equal(state.userFindAllCalls[0].limit, 5);
  assert.equal(state.userFindAllCalls[0].offset, 5);
});

test('UTCID03: getLocalGuides applies search filter across full name, email, and phone', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
    userCount: async () => 0,
    userFindAll: async () => [],
  });

  await ManagerLocalGuideService.getLocalGuides('manager-id', { search: 'guide' });

  const orConditions = state.userCountCalls[0].where[Op.or];
  assert.equal(orConditions.length, 3);
  assert.equal(orConditions[0].full_name[Op.iLike], '%guide%');
  assert.equal(orConditions[1].email[Op.iLike], '%guide%');
  assert.equal(orConditions[2].phone[Op.iLike], '%guide%');
});

test('UTCID04: getLocalGuides rejects when manager is not found', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => null,
  });

  await assert.rejects(
    ManagerLocalGuideService.getLocalGuides('missing-manager-id'),
    { message: 'Manager not found' }
  );
});

test('UTCID05: getLocalGuides rejects when manager has no site', async () => {
  const { ManagerLocalGuideService } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.getLocalGuides('manager-id'),
    { message: 'Manager has no site' }
  );
});
