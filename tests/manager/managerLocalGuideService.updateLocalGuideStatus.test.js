const test = require('node:test');
const assert = require('node:assert/strict');

const { loadManagerLocalGuideService } = require('./_managerLocalGuideTestHelper');

test('UTCID01: updateLocalGuideStatus bans local guide and rejects pending content plus future shifts', async () => {
  const localGuide = {
    id: 'guide-id',
    email: 'guide@example.com',
    full_name: 'Local Guide',
    status: 'active',
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: {
        id: 'site-1',
        name: 'Holy Church',
      },
    }),
    userFindOne: async () => localGuide,
  });

  const result = await ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'guide-id', 'banned');

  assert.equal(result.status, 'banned');
  assert.equal(state.eventUpdateCalls.length, 1);
  assert.equal(state.siteMediaUpdateCalls.length, 1);
  assert.equal(state.massScheduleUpdateCalls.length, 1);
  assert.equal(state.nearbyPlaceUpdateCalls.length, 1);
  assert.equal(state.guideShiftSubmissionUpdateCalls.length, 1);
  assert.equal(state.notificationCreateCalls.length, 1);
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
});

test('UTCID02: updateLocalGuideStatus reactivates banned local guide successfully', async () => {
  const localGuide = {
    id: 'guide-id',
    email: 'guide@example.com',
    full_name: 'Local Guide',
    status: 'banned',
    update: async function (data) {
      Object.assign(this, data);
      return this;
    },
  };

  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', name: 'Holy Church' },
    }),
    userFindOne: async () => localGuide,
  });

  const result = await ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'guide-id', 'active');

  assert.equal(result.status, 'active');
  assert.equal(state.eventUpdateCalls.length, 0);
  assert.equal(state.notificationCreateCalls.length, 0);
  assert.equal(state.transactionCommitCalls, 1);
});

test('UTCID03: updateLocalGuideStatus rejects invalid status and rolls back transaction', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', name: 'Holy Church' },
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'guide-id', 'inactive'),
    { message: 'Invalid status' }
  );

  assert.equal(state.transactionCommitCalls, 0);
  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID04: updateLocalGuideStatus rejects when local guide is not found', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', name: 'Holy Church' },
    }),
    userFindOne: async () => null,
  });

  await assert.rejects(
    ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'missing-guide-id', 'banned'),
    { message: 'Local Guide not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID05: updateLocalGuideStatus rejects when local guide already has the target status', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
      assignedSite: { id: 'site-1', name: 'Holy Church' },
    }),
    userFindOne: async () => ({
      id: 'guide-id',
      email: 'guide@example.com',
      status: 'banned',
      update: async () => {
        throw new Error('update should not be called');
      },
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'guide-id', 'banned'),
    { message: 'Local Guide is already banned' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
});

test('UTCID06: updateLocalGuideStatus rejects when manager has no site', async () => {
  const { ManagerLocalGuideService, state } = loadManagerLocalGuideService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: null,
      assignedSite: null,
    }),
  });

  await assert.rejects(
    ManagerLocalGuideService.updateLocalGuideStatus('manager-id', 'guide-id', 'banned'),
    { message: 'Manager has no site' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
});
