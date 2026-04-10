const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideScheduleService } = require('./_localGuideTestHelper');

test('UTCID01: createSchedule creates a new pending schedule successfully', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Local Guide',
    }),
  });

  LocalGuideScheduleService.generateScheduleCode = async () => 'MS0326001';

  const result = await LocalGuideScheduleService.createSchedule('guide-id', {
    days_of_week: [0, 6],
    time: '08:00',
    note: 'Sunday mass',
  });

  assert.equal(result.code, 'MS0326001');
  assert.equal(result.status, 'pending');
  assert.deepEqual(state.massScheduleCreateCalls[0], {
    site_id: 'site-1',
    code: 'MS0326001',
    days_of_week: [0, 6],
    time: '08:00',
    note: 'Sunday mass',
    status: 'pending',
    created_by: 'guide-id',
  });
  assert.equal(state.notificationCalls.length, 1);
});

test('UTCID02: createSchedule rejects unauthorized user', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.createSchedule('manager-id', {
      days_of_week: [1],
      time: '09:00',
    }),
    { message: 'Unauthorized' }
  );
});

test('UTCID03: createSchedule rejects local guide without site', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.createSchedule('guide-id', {
      days_of_week: [1],
      time: '09:00',
    }),
    { message: 'Local Guide has no site' }
  );
});

test('UTCID04: createSchedule rejects empty days_of_week', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.createSchedule('guide-id', {
      days_of_week: [],
      time: '09:00',
    }),
    { message: 'days_of_week must be a non-empty array' }
  );
});

test('UTCID05: createSchedule rejects invalid day of week', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.createSchedule('guide-id', {
      days_of_week: [7],
      time: '09:00',
    }),
    { message: 'Each day must be between 0 and 6' }
  );
});

test('UTCID06: createSchedule creates schedule with required fields only', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      email: 'guide@example.com',
    }),
  });

  LocalGuideScheduleService.generateScheduleCode = async () => 'MS0326002';

  const result = await LocalGuideScheduleService.createSchedule('guide-id', {
    days_of_week: [1, 3, 5],
    time: '17:30',
  });

  assert.equal(result.code, 'MS0326002');
  assert.deepEqual(state.massScheduleCreateCalls[0].days_of_week, [1, 3, 5]);
  assert.equal(state.massScheduleCreateCalls[0].note, undefined);
});

test('UTCID07: createSchedule rejects time outside site opening hours', async () => {
  const { LocalGuideScheduleService } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Local Guide',
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      opening_hours: {
        open: '06:00',
        close: '18:00',
      },
    }),
  });

  await assert.rejects(
    LocalGuideScheduleService.createSchedule('guide-id', {
      days_of_week: [0],
      time: '05:30',
      note: 'Early mass',
    }),
    (error) => {
      assert.equal(error.message, 'Schedule time outside opening hours');
      assert.deepEqual(error.meta, {
        time: '05:30',
        open: '06:00',
        close: '18:00',
      });
      return true;
    }
  );
});

test('UTCID08: createSchedule allows time when site has no opening hours', async () => {
  const { LocalGuideScheduleService, state } = loadLocalGuideScheduleService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      email: 'guide@example.com',
    }),
    siteFindByPk: async () => ({
      id: 'site-1',
      opening_hours: null,
    }),
  });

  LocalGuideScheduleService.generateScheduleCode = async () => 'MS0326003';

  const result = await LocalGuideScheduleService.createSchedule('guide-id', {
    days_of_week: [2],
    time: '22:30',
  });

  assert.equal(result.code, 'MS0326003');
  assert.equal(state.massScheduleCreateCalls[0].time, '22:30');
});
