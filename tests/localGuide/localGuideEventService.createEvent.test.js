const test = require('node:test');
const assert = require('node:assert/strict');

const { loadLocalGuideEventService } = require('./_localGuideTestHelper');

test('UTCID01: createEvent creates a new pending event successfully with full data', async () => {
  const { LocalGuideEventService, state } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Local Guide',
    }),
  });

  LocalGuideEventService.generateEventCode = async () => 'EVT0407001';

  const result = await LocalGuideEventService.createEvent(
    'guide-id',
    {
      name: 'Easter Celebration',
      description: 'Annual event',
      start_date: '2026-04-20',
      end_date: '2026-04-21',
      start_time: '08:00',
      end_time: '11:00',
      location: 'Main Hall',
      category: 'religious',
    },
    'https://res.cloudinary.com/demo/image/upload/v1/banner.jpg'
  );

  assert.equal(result.code, 'EVT0407001');
  assert.equal(result.status, 'pending');
  assert.equal(state.eventCreateCalls[0].banner_url, 'https://res.cloudinary.com/demo/image/upload/v1/banner.jpg');
  assert.equal(state.notificationCalls.length, 1);
});

test('UTCID02: createEvent rejects unauthorized user', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'manager-id',
      role: 'manager',
      site_id: 'site-1',
    }),
  });

  await assert.rejects(
    LocalGuideEventService.createEvent('manager-id', {
      name: 'Easter Celebration',
      start_date: '2026-04-20',
    }),
    { message: 'Unauthorized' }
  );
});

test('UTCID03: createEvent rejects local guide without site', async () => {
  const { LocalGuideEventService } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: null,
    }),
  });

  await assert.rejects(
    LocalGuideEventService.createEvent('guide-id', {
      name: 'Easter Celebration',
      start_date: '2026-04-20',
    }),
    { message: 'Local Guide has no site' }
  );
});

test('UTCID04: createEvent creates event successfully with required fields only', async () => {
  const { LocalGuideEventService, state } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      email: 'guide@example.com',
    }),
  });

  LocalGuideEventService.generateEventCode = async () => 'EVT0407002';

  const result = await LocalGuideEventService.createEvent('guide-id', {
    name: 'Morning Prayer',
    description: 'Simple gathering',
    start_date: '2026-04-22',
  });

  assert.equal(result.code, 'EVT0407002');
  assert.equal(state.eventCreateCalls[0].end_date, null);
  assert.equal(state.eventCreateCalls[0].start_time, null);
  assert.equal(state.eventCreateCalls[0].banner_url, null);
});

test('UTCID05: createEvent stores nullable optional fields correctly', async () => {
  const { LocalGuideEventService, state } = loadLocalGuideEventService({
    userFindByPk: async () => ({
      id: 'guide-id',
      role: 'local_guide',
      site_id: 'site-1',
      full_name: 'Guide Name',
    }),
  });

  LocalGuideEventService.generateEventCode = async () => 'EVT0407003';

  const result = await LocalGuideEventService.createEvent(
    'guide-id',
    {
      name: 'Youth Meeting',
      description: 'Monthly meeting',
      start_date: '2026-04-30',
      location: 'Room A',
    },
    null
  );

  assert.equal(result.code, 'EVT0407003');
  assert.equal(state.eventCreateCalls[0].location, 'Room A');
  assert.equal(state.eventCreateCalls[0].category, null);
});
