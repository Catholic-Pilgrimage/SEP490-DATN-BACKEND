const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(createJournalInstance, data = {}) {
  return createJournalInstance({
    id: 'journal-id',
    user_id: 'owner-id',
    site_id: 'site-id',
    planner_id: 'planner-id',
    planner_item_id: ['item-1'],
    title: 'Old title',
    content: 'Old content',
    audio_url: 'https://cdn.example.com/old.mp3',
    image_url: ['https://cdn.example.com/old-1.jpg'],
    video_url: 'https://cdn.example.com/old.mp4',
    privacy: 'private',
    is_active: true,
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
  });
}

function stubBuildJournalResponse(JournalService) {
  JournalService.buildJournalResponse = async (journal) => ({
    id: journal.id,
    title: journal.title,
    content: journal.content,
    image_url: journal.image_url,
    audio_url: journal.audio_url,
    video_url: journal.video_url,
    privacy: journal.privacy,
  });
}

test('UTCID01: updateJournal updates journal successfully with merged uploaded media', async () => {
  let journalRecord;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => {
      journalRecord = createJournalRow(createJournalInstance);
      return journalRecord;
    },
    journalFindByPk: async () => journalRecord,
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.updateJournal(
    'journal-id',
    'owner-id',
    {
      title: '  Updated title  ',
      content: '  Updated content  ',
      image_url: ['https://cdn.example.com/requested-1.jpg'],
      audio_url: ' https://cdn.example.com/requested.mp3 ',
      video_url: ' https://cdn.example.com/requested.mp4 ',
    },
    [
      { path: 'https://cdn.example.com/uploaded-1.jpg' },
      { url: 'https://cdn.example.com/uploaded-2.jpg' },
    ],
    { path: 'https://cdn.example.com/new-audio.mp3' },
    { url: 'https://cdn.example.com/new-video.mp4' }
  );

  assert.equal(state.journalUpdateCalls.length, 1);
  assert.equal(state.journalUpdateCalls[0].values.title, 'Updated title');
  assert.equal(state.journalUpdateCalls[0].values.content, 'Updated content');
  assert.deepEqual(state.journalUpdateCalls[0].values.image_url, [
    'https://cdn.example.com/requested-1.jpg',
    'https://cdn.example.com/uploaded-1.jpg',
    'https://cdn.example.com/uploaded-2.jpg',
  ]);
  assert.equal(state.journalUpdateCalls[0].values.audio_url, 'https://cdn.example.com/new-audio.mp3');
  assert.equal(state.journalUpdateCalls[0].values.video_url, 'https://cdn.example.com/new-video.mp4');
  assert.equal(state.journalUpdateCalls[0].values.privacy, 'private');
  assert.equal(state.journalUpdateCalls[0].values.planner_id, 'planner-id');
  assert.equal(state.journalUpdateCalls[0].values.site_id, 'site-id');
  assert.deepEqual(state.journalUpdateCalls[0].values.planner_item_id, ['item-1']);
  assert.equal(result.title, 'Updated title');
  assert.equal(result.audio_url, 'https://cdn.example.com/new-audio.mp3');
  assert.equal(result.video_url, 'https://cdn.example.com/new-video.mp4');
  assert.equal(state.infoLogs[0][0], 'Journal updated by user owner-id: journal-id');
});

test('UTCID02: updateJournal supports image_url alias input and keeps requested audio-video when no file uploaded', async () => {
  let journalRecord;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => {
      journalRecord = createJournalRow(createJournalInstance);
      return journalRecord;
    },
    journalFindByPk: async () => journalRecord,
  });

  stubBuildJournalResponse(JournalService);

  const result = await JournalService.updateJournal(
    'journal-id',
    'owner-id',
    {
      title: 'Alias title',
      content: 'Alias content',
      'image_url[]': ['https://cdn.example.com/alias-1.jpg', 'https://cdn.example.com/alias-1.jpg'],
      audio_url: 'https://cdn.example.com/audio-kept.mp3',
      video_url: 'https://cdn.example.com/video-kept.mp4',
    }
  );

  assert.deepEqual(state.journalUpdateCalls[0].values.image_url, [
    'https://cdn.example.com/alias-1.jpg',
    'https://cdn.example.com/alias-1.jpg',
  ]);
  assert.equal(state.journalUpdateCalls[0].values.audio_url, 'https://cdn.example.com/audio-kept.mp3');
  assert.equal(state.journalUpdateCalls[0].values.video_url, 'https://cdn.example.com/video-kept.mp4');
  assert.equal(result.image_url.length, 2);
});

test('UTCID03: updateJournal throws when journal does not exist', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.updateJournal('missing-journal-id', 'owner-id', {
      title: 'Updated title',
      content: 'Updated content',
    }),
    { message: 'Journal not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Update journal error:');
});

test('UTCID04: updateJournal throws forbidden when requester is not owner', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, { user_id: 'other-owner-id' }),
  });

  await assert.rejects(
    JournalService.updateJournal('journal-id', 'owner-id', {
      title: 'Updated title',
      content: 'Updated content',
    }),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Update journal error:');
});

test('UTCID05: updateJournal throws when title or content is missing after trim', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance),
  });

  await assert.rejects(
    JournalService.updateJournal('journal-id', 'owner-id', {
      title: '   ',
      content: 'Updated content',
    }),
    { message: 'Title and content are required' }
  );

  assert.equal(state.errorLogs[0][0], 'Update journal error:');
});

test('UTCID06: updateJournal throws when merged images exceed 10 files', async () => {
  const existingImages = Array.from({ length: 9 }, (_, index) => `https://cdn.example.com/existing-${index + 1}.jpg`);
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      image_url: existingImages,
    }),
  });

  await assert.rejects(
    JournalService.updateJournal(
      'journal-id',
      'owner-id',
      {
        title: 'Updated title',
        content: 'Updated content',
        image_url: existingImages,
      },
      [
        { path: 'https://cdn.example.com/uploaded-10.jpg' },
        { path: 'https://cdn.example.com/uploaded-11.jpg' },
      ]
    ),
    { message: 'Maximum 10 images allowed' }
  );

  assert.equal(state.errorLogs[0][0], 'Update journal error:');
});
