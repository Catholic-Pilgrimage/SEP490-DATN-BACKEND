const test = require('node:test');
const assert = require('node:assert/strict');
const { Op } = require('sequelize');

const { loadLocalGuideScheduleService } = require('./_localGuideTestHelper');

test('UTCID01: getSchedules returns paginated schedules successfully', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleCount: async () => 2,
    massScheduleFindAll: async () => [
      { id: 'schedule-1', code: 'MS0326001' },
      { id: 'schedule-2', code: 'MS0326002' },
    ],
  });

  const result = await LocalGuideScheduleService.getSchedules('guide-id', {
    page: 1,
    limit: 10,
  });

  assert.equal(result.data.length, 2);
  assert.equal(result.pagination.totalItems, 2);
  assert.equal(result.pagination.totalPages, 1);
});

test('UTCID02: getSchedules applies status filter correctly', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleCount: async () => 1,
    massScheduleFindAll: async () => [{ id: 'schedule-1', status: 'approved' }],
  });

  await LocalGuideScheduleService.getSchedules('guide-id', {
    status: 'approved',
    page: 2,
    limit: 5,
  });

  assert.equal(state.massScheduleCountCalls[0].where.status, 'approved');
  assert.equal(state.massScheduleFindAllCalls[0].offset, 5);
  assert.equal(state.massScheduleFindAllCalls[0].limit, 5);
});

test('UTCID03: getSchedules applies day_of_week filter correctly', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleCount: async () => 1,
    massScheduleFindAll: async () => [{ id: 'schedule-1', days_of_week: [0, 2] }],
  });

  await LocalGuideScheduleService.getSchedules('guide-id', {
    day_of_week: 2,
  });

  assert.deepEqual(state.massScheduleCountCalls[0].where.days_of_week, { [Op.contains]: [2] });
});

test('UTCID04: getSchedules applies inactive filter correctly', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleCount: async () => 1,
    massScheduleFindAll: async () => [{ id: 'schedule-1', is_active: false }],
  });

  await LocalGuideScheduleService.getSchedules('guide-id', {
    is_active: false,
  });

  assert.equal(state.massScheduleCountCalls[0].where.is_active, false);
});

test('UTCID05: getSchedules rejects unauthorized user', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.getSchedules('manager-id'),
    { message: 'Unauthorized' }
  );
});
