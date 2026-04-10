const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideScheduleService } = require('./_localGuideTestHelper');

test('UTCID01: deleteSchedule soft deletes pending schedule successfully', async () => {
  const { LocalGuideScheduleService, state, createScheduleInstance } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleFindOne: async () => createScheduleInstance({
      id: 'schedule-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      is_active: true,
    }),
  });

  const result = await LocalGuideScheduleService.deleteSchedule('guide-id', 'schedule-id');

  assert.equal(result.message, 'Schedule deleted successfully');
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.is_active, false);
});

test('UTCID02: deleteSchedule rejects when schedule is not found', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideScheduleService.deleteSchedule('guide-id', 'missing-schedule-id'),
    { message: 'Schedule not found' }
  );
});

test('UTCID03: deleteSchedule rejects approved schedule', async () => {
  const { LocalGuideScheduleService, createScheduleInstance } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleFindOne: async () => createScheduleInstance({
      id: 'schedule-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'approved',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.deleteSchedule('guide-id', 'schedule-id'),
    { message: 'Cannot delete approved schedule' }
  );
});

test('UTCID04: deleteSchedule rejects unauthorized user', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.deleteSchedule('manager-id', 'schedule-id'),
    { message: 'Unauthorized' }
  );
});
