const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideScheduleService } = require('./_localGuideTestHelper');

test('UTCID01: restoreSchedule restores inactive pending schedule successfully', async () => {
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
      is_active: false,
    }),
  });

  const result = await LocalGuideScheduleService.restoreSchedule('guide-id', 'schedule-id');

  assert.equal(result.is_active, true);
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.is_active, true);
});

test('UTCID02: restoreSchedule rejects when schedule is not found', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideScheduleService.restoreSchedule('guide-id', 'missing-schedule-id'),
    { message: 'Schedule not found' }
  );
});

test('UTCID03: restoreSchedule rejects approved schedule', async () => {
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
      is_active: false,
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.restoreSchedule('guide-id', 'schedule-id'),
    { message: 'Cannot restore approved schedule' }
  );
});

test('UTCID04: restoreSchedule rejects already active schedule', async () => {
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
      status: 'pending',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.restoreSchedule('guide-id', 'schedule-id'),
    { message: 'Schedule is already active' }
  );
});

test('UTCID05: restoreSchedule restores inactive rejected schedule successfully', async () => {
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
      status: 'rejected',
      is_active: false,
    }),
  });

  const result = await LocalGuideScheduleService.restoreSchedule('guide-id', 'schedule-id');

  assert.equal(result.is_active, true);
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.is_active, true);
});
