const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadJournalService,
  createPlannerRecord,
  createPlannerItemRecord,
} = require('./_journalTestHelper');

function stubBuildJournalResponse(JournalService) {
  JournalService.buildJournalResponse = async (journal) => ({
    id: journal.id,
    site_id: journal.site_id,
    planner_id: journal.planner_id,
    planner_item_id: journal.planner_item_id,
    title: journal.title,
    content: journal.content,
    audio_url: journal.audio_url,
    image_url: journal.image_url,
    video_url: journal.video_url,
  });
}

test('UTCID01: createJournal creates a point journal for checked-in completed planner items', async () => {
  let createdJournal = null;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    plannerItemFindAll: async () => ([
      createPlannerItemRecord({
        id: 'item-1',
        planner_id: 'planner-1',
        site_id: 'site-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
      createPlannerItemRecord({
        id: 'item-2',
        planner_id: 'planner-1',
        site_id: 'site-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
    ]),
    userCheckinFindAll: async () => ([
      { planner_item_id: 'item-1' },
      { planner_item_id: 'item-2' },
    ]),
    journalCreate: async (data) => {
      createdJournal = createJournalInstance({
        id: 'journal-id',
        ...data,
      });
      return createdJournal;
    },
    journalFindByPk: async () => createdJournal,
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.createJournal(
    'user-id',
    {
      title: '  Reflection at La Vang  ',
      content: '  Peaceful pilgrimage.  ',
      planner_item_id: ['item-1', 'item-2'],
    },
    [{ path: 'https://cdn.example.com/j1.jpg' }],
    { path: 'https://cdn.example.com/j1.mp3' },
    { url: 'https://cdn.example.com/j1.mp4' }
  );

  assert.equal(state.journalCreateCalls.length, 1);
  assert.deepEqual(state.journalCreateCalls[0].data, {
    user_id: 'user-id',
    site_id: 'site-1',
    planner_id: 'planner-1',
    planner_item_id: ['item-1', 'item-2'],
    title: 'Reflection at La Vang',
    content: 'Peaceful pilgrimage.',
    audio_url: 'https://cdn.example.com/j1.mp3',
    image_url: ['https://cdn.example.com/j1.jpg'],
    video_url: 'https://cdn.example.com/j1.mp4',
    privacy: 'private',
    is_active: true,
  });
  assert.equal(result.site_id, 'site-1');
  assert.equal(result.planner_id, 'planner-1');
  assert.deepEqual(result.planner_item_id, ['item-1', 'item-2']);
  assert.equal(state.infoLogs[0][0], 'Journal created by user user-id at site site-1: journal-id');
});

test('UTCID02: createJournal creates a summary journal for a joined member with checked-in sites', async () => {
  let createdJournal = null;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    plannerFindByPk: async () => createPlannerRecord({
      id: 'planner-2',
      status: 'completed',
      user_id: 'owner-id',
    }),
    plannerMemberFindOne: async () => ({
      planner_id: 'planner-2',
      user_id: 'user-id',
      join_status: 'joined',
    }),
    journalCreate: async (data) => {
      createdJournal = createJournalInstance({
        id: 'journal-summary-id',
        ...data,
      });
      return createdJournal;
    },
    journalFindByPk: async () => createdJournal,
  });

  JournalService.getCheckedInPlannerSites = async () => ([
    { planner_item_id: 'item-1', site_id: 'site-1' },
  ]);
  JournalService.findExistingSummaryJournal = async () => null;
  stubBuildJournalResponse(JournalService);

  const result = await JournalService.createJournal('user-id', {
    title: '  Journey Summary  ',
    content: '  Completed with gratitude.  ',
    planner_id: 'planner-2',
  });

  assert.equal(state.journalCreateCalls.length, 1);
  assert.deepEqual(state.journalCreateCalls[0].data, {
    user_id: 'user-id',
    site_id: null,
    planner_id: 'planner-2',
    planner_item_id: [],
    title: 'Journey Summary',
    content: 'Completed with gratitude.',
    audio_url: null,
    image_url: [],
    video_url: null,
    privacy: 'private',
    is_active: true,
  });
  assert.equal(result.site_id, null);
  assert.equal(result.planner_id, 'planner-2');
  assert.deepEqual(result.planner_item_id, []);
  assert.equal(state.infoLogs[0][0], 'Journal created by user user-id at site null: journal-summary-id');
});

test('UTCID03: createJournal throws when title or content is missing', async () => {
  const { JournalService, state } = loadJournalService();

  await assert.rejects(
    JournalService.createJournal('user-id', {
      title: '',
      content: 'Content',
      planner_id: 'planner-1',
    }),
    { message: 'Title and content are required' }
  );

  assert.equal(state.errorLogs[0][0], 'Create journal error:');
});

test('UTCID04: createJournal throws when a planner item cannot be found', async () => {
  const { JournalService, state } = loadJournalService({
    plannerItemFindAll: async () => ([
      createPlannerItemRecord({
        id: 'item-1',
        planner_id: 'planner-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
    ]),
  });

  await assert.rejects(
    JournalService.createJournal('user-id', {
      title: 'Point journal',
      content: 'Content',
      planner_item_id: ['item-1', 'item-2'],
    }),
    { message: 'Planner item not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Create journal error:');
});

test('UTCID05: createJournal throws when user has not checked in at all selected locations', async () => {
  const { JournalService, state } = loadJournalService({
    plannerItemFindAll: async () => ([
      createPlannerItemRecord({
        id: 'item-1',
        planner_id: 'planner-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
      createPlannerItemRecord({
        id: 'item-2',
        planner_id: 'planner-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
    ]),
    userCheckinFindAll: async () => ([
      { planner_item_id: 'item-1' },
    ]),
  });

  await assert.rejects(
    JournalService.createJournal('user-id', {
      title: 'Point journal',
      content: 'Content',
      planner_item_id: ['item-1', 'item-2'],
    }),
    { message: 'You must check-in at all selected locations before creating a journal.' }
  );

  assert.equal(state.errorLogs[0][0], 'Create journal error:');
});

test('UTCID06: createJournal allows point journal when journey is ongoing and all selected locations were checked in', async () => {
  let createdJournal = null;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    plannerItemFindAll: async () => ([
      createPlannerItemRecord({
        id: 'item-1',
        planner_id: 'planner-1',
        site_id: 'site-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'ongoing' }),
      }),
    ]),
    userCheckinFindAll: async () => ([
      { planner_item_id: 'item-1' },
    ]),
    journalCreate: async (data) => {
      createdJournal = createJournalInstance({
        id: 'journal-ongoing-id',
        ...data,
      });
      return createdJournal;
    },
    journalFindByPk: async () => createdJournal,
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.createJournal('user-id', {
    title: 'Point journal',
    content: 'Content',
    planner_item_id: ['item-1'],
  });

  assert.equal(state.journalCreateCalls.length, 1);
  assert.equal(state.journalCreateCalls[0].data.planner_id, 'planner-1');
  assert.equal(state.journalCreateCalls[0].data.site_id, 'site-1');
  assert.deepEqual(state.journalCreateCalls[0].data.planner_item_id, ['item-1']);
  assert.equal(result.planner_id, 'planner-1');
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID07: createJournal throws conflict when an archived point journal already exists', async () => {
  const { JournalService, state } = loadJournalService({
    plannerItemFindAll: async () => ([
      createPlannerItemRecord({
        id: 'item-1',
        planner_id: 'planner-1',
        planner: createPlannerRecord({ id: 'planner-1', status: 'completed' }),
      }),
    ]),
    userCheckinFindAll: async () => ([
      { planner_item_id: 'item-1' },
    ]),
  });

  JournalService.findExistingPointJournal = async () => ({
    id: 'archived-journal-id',
    is_active: false,
  });

  await assert.rejects(
    JournalService.createJournal('user-id', {
      title: 'Point journal',
      content: 'Content',
      planner_item_id: ['item-1'],
    }),
    (error) => {
      assert.equal(error.message, 'Archived journal exists');
      assert.deepEqual(error.details, {
        journal_id: 'archived-journal-id',
        is_active: false,
        can_restore: true,
      });
      return true;
    }
  );

  assert.equal(state.errorLogs[0][0], 'Create journal error:');
});
