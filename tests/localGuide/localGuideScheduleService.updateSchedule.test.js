const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideScheduleService } = require('./_localGuideTestHelper');

test('UTCID01: updateSchedule updates pending schedule successfully', async () => {
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
      days_of_week: [1],
      time: '08:00',
      note: 'Old note',
      is_active: true,
    }),
  });

  const result = await LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', {
    days_of_week: [2, 4],
    time: '09:00',
    note: 'Updated note',
  });

  assert.deepEqual(result.days_of_week, [2, 4]);
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.time, '09:00');
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.note, 'Updated note');
});

test('UTCID02: updateSchedule resets rejected schedule to pending', async () => {
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
      rejection_reason: 'Needs revision',
      reviewed_by: 'manager-id',
      reviewed_at: new Date('2026-03-25T00:00:00.000Z'),
      is_active: true,
    }),
  });

  const result = await LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', {
    note: 'Revised note',
  });

  assert.equal(result.status, 'pending');
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.status, 'pending');
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.rejection_reason, null);
});

test('UTCID03: updateSchedule rejects unauthorized user', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.updateSchedule('manager-id', 'schedule-id', { note: 'Updated' }),
    { message: 'Unauthorized' }
  );
});

test('UTCID04: updateSchedule rejects when schedule is not found', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    massScheduleFindOne: async () => null,
  });

  await assert.rejects(
    LocalGuideScheduleService.updateSchedule('guide-id', 'missing-schedule-id', { note: 'Updated' }),
    { message: 'Schedule not found' }
  );
});

test('UTCID05: updateSchedule rejects approved schedule', async () => {
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
    LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', { note: 'Updated' }),
    { message: 'Cannot update approved schedule' }
  );
});

test('UTCID06: updateSchedule rejects invalid days_of_week array', async () => {
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
    LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', { days_of_week: [] }),
    { message: 'days_of_week must be a non-empty array' }
  );
});

test('UTCID07: updateSchedule rejects time outside site opening hours', async () => {
  const { LocalGuideScheduleService, createScheduleInstance } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      opening_hours: {
        open: '06:00',
        close: '18:00',
      },
    }),
    massScheduleFindOne: async () => createScheduleInstance({
      id: 'schedule-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      time: '08:00',
      is_active: true,
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', { time: '19:00' }),
    (error) => {
      assert.equal(error.message, 'Schedule time outside opening hours');
      assert.deepEqual(error.meta, {
        time: '19:00',
        open: '06:00',
        close: '18:00',
      });
      return true;
    }
  );
});

test('UTCID08: updateSchedule allows time update when site has no opening hours', async () => {
  const { LocalGuideScheduleService, state, createScheduleInstance } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      opening_hours: null,
    }),
    massScheduleFindOne: async () => createScheduleInstance({
      id: 'schedule-id',
      site_id: 'site-1',
      created_by: 'guide-id',
      status: 'pending',
      time: '08:00',
      is_active: true,
    }),
  });

  const result = await LocalGuideScheduleService.updateSchedule('guide-id', 'schedule-id', { time: '21:15' });

  assert.equal(result.time, '21:15');
  assert.equal(state.scheduleInstanceUpdateCalls[0].values.time, '21:15');
});
