const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(data = {}) {
  return {
    id: 'journal-id',
    user_id: 'owner-id',
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
      id: 'owner-id',
      full_name: 'Owner User',
      email: 'owner@example.com',
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
    user_id: journal.user_id,
    planner_id: journal.planner_id,
    title: journal.title,
  });
}

test('UTCID01: getJournalById returns journal detail for owner', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => createJournalRow(),
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getJournalById('journal-id', 'owner-id');

  assert.equal(result.id, 'journal-id');
  assert.equal(result.user_id, 'owner-id');
  assert.equal(state.postFindOneCalls.length, 0);
});

test('UTCID02: getJournalById allows non-owner access when journal is shared directly as published post', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => createJournalRow(),
    postFindOne: async (options) => {
      if (options.where?.journal_id === 'journal-id') {
        return { id: 'post-id', journal_id: 'journal-id', status: 'published', is_active: true };
      }
      return null;
    },
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getJournalById('journal-id', 'other-user-id');

  assert.equal(result.id, 'journal-id');
  assert.equal(state.postFindOneCalls.length, 1);
  assert.deepEqual(state.postFindOneCalls[0].where, {
    journal_id: 'journal-id',
    status: 'published',
    is_active: true,
  });
});

test('UTCID03: getJournalById allows non-owner access when journey is shared publicly by planner_id', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => createJournalRow({
      id: 'summary-journal-id',
      site_id: null,
      planner_id: 'planner-2',
    }),
    postFindOne: async (options) => {
      if (options.where?.journal_id) {
        return null;
      }
      if (options.where?.planner_id === 'planner-2') {
        return {
          id: 'journey-post-id',
          user_id: 'owner-id',
          planner_id: 'planner-2',
          status: 'published',
          is_active: true,
        };
      }
      return null;
    },
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getJournalById('summary-journal-id', 'other-user-id');

  assert.equal(result.id, 'summary-journal-id');
  assert.equal(state.postFindOneCalls.length, 2);
  assert.deepEqual(state.postFindOneCalls[1].where, {
    user_id: 'owner-id',
    status: 'published',
    planner_id: 'planner-2',
    is_active: true,
  });
});

test('UTCID04: getJournalById allows unauthenticated access when journal is shared directly as published post', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => createJournalRow(),
    postFindOne: async (options) => {
      if (options.where?.journal_id === 'journal-id') {
        return { id: 'post-id', journal_id: 'journal-id', status: 'published', is_active: true };
      }
      return null;
    },
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.getJournalById('journal-id');

  assert.equal(result.id, 'journal-id');
  assert.equal(state.postFindOneCalls.length, 1);
});

test('UTCID05: getJournalById throws when journal does not exist', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.getJournalById('missing-journal-id', 'owner-id'),
    { message: 'Journal not found' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get journal by ID error:');
});

test('UTCID06: getJournalById throws forbidden when journal is not shared publicly', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => createJournalRow({
      planner_id: 'planner-3',
    }),
    postFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.getJournalById('journal-id', 'stranger-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.postFindOneCalls.length, 2);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Get journal by ID error:');
});
