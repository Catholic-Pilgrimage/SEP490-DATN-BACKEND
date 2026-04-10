const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(data = {}) {
  return {
    id: 'journal-id',
    user_id: 'user-id',
    site_id: 'site-id',
    planner_id: 'planner-id',
    planner_item_id: ['item-1'],
    title: 'Journal title',
    content: 'Journal content',
    audio_url: null,
    image_url: [],
    video_url: null,
    privacy: 'private',
    is_active: true,
    created_at: new Date('2026-04-09T08:00:00.000Z'),
    updated_at: new Date('2026-04-09T08:00:00.000Z'),
    author: {
      id: 'user-id',
      full_name: 'User Name',
      email: 'user@example.com',
      avatar_url: null,
    },
    site: {
      id: 'site-id',
      name: 'La Vang',
      code: 'S001',
      province: 'Hue',
      cover_image: null,
    },
    ...data,
  };
}

function stubBuildJournalResponse(JournalService) {
  JournalService.buildJournalResponse = async (journal) => ({
    id: journal.id,
    is_active: journal.is_active,
    title: journal.title,
    planner_id: journal.planner_id,
  });
}

test('UTCID01: getUserJournals returns active journals by default with pagination', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindAndCountAll: async () => ({
      rows: [
        createJournalRow({ id: 'journal-1', is_active: true, title: 'Newest journal' }),
        createJournalRow({ id: 'journal-2', is_active: true, title: 'Older journal' }),
      ],
      count: 2,
    }),
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getUserJournals('user-id', { page: 1, limit: 10 });

  assert.equal(state.journalFindAndCountAllCalls.length, 1);
  assert.deepEqual(state.journalFindAndCountAllCalls[0].where, {
    user_id: 'user-id',
    is_active: true,
  });
  assert.equal(result.journals.length, 2);
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 10);
  assert.equal(result.pagination.total, 2);
  assert.equal(result.pagination.totalPages, 1);
});

test('UTCID02: getUserJournals returns inactive journals when is_active is false', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindAndCountAll: async () => ({
      rows: [
        createJournalRow({ id: 'journal-archived', is_active: false, title: 'Archived journal' }),
      ],
      count: 1,
    }),
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getUserJournals('user-id', { page: 2, limit: 1, is_active: 'false' });

  assert.deepEqual(state.journalFindAndCountAllCalls[0].where, {
    user_id: 'user-id',
    is_active: false,
  });
  assert.equal(state.journalFindAndCountAllCalls[0].limit, 1);
  assert.equal(state.journalFindAndCountAllCalls[0].offset, 1);
  assert.equal(result.journals[0].is_active, false);
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.totalPages, 1);
});

test('UTCID03: getUserJournals returns all journals when is_active filter is not true or false', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindAndCountAll: async () => ({
      rows: [
        createJournalRow({ id: 'journal-active', is_active: true }),
        createJournalRow({ id: 'journal-inactive', is_active: false }),
      ],
      count: 2,
    }),
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getUserJournals('user-id', { is_active: 'all' });

  assert.deepEqual(state.journalFindAndCountAllCalls[0].where, {
    user_id: 'user-id',
  });
  assert.equal(result.journals.length, 2);
  assert.equal(result.journals[0].id, 'journal-active');
  assert.equal(result.journals[1].id, 'journal-inactive');
});

test('UTCID04: getUserJournals returns empty list when user has no journals', async () => {
  const { JournalService } = loadJournalService({
    journalFindAndCountAll: async () => ({
      rows: [],
      count: 0,
    }),
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getUserJournals('user-id', { page: 1, limit: 10 });

  assert.deepEqual(result.journals, []);
  assert.equal(result.pagination.total, 0);
  assert.equal(result.pagination.totalPages, 0);
});

test('UTCID05: getUserJournals logs and rethrows database errors', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindAndCountAll: async () => {
      throw new Error('Database unavailable');
    },
  });

  await assert.rejects(
    JournalService.getUserJournals('user-id'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get user journals error:');
});
