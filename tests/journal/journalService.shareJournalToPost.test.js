const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(createJournalInstance, data = {}) {
  return createJournalInstance({
    id: 'journal-id',
    user_id: 'owner-id',
    site_id: 'site-id',
    title: 'Journal title',
    content: 'Journal content',
    image_url: ['https://cdn.example.com/image-1.jpg'],
    audio_url: 'https://cdn.example.com/audio.mp3',
    video_url: 'https://cdn.example.com/video.mp4',
    is_active: true,
    ...data,
  });
}

test('UTCID01: shareJournalToPost creates published post successfully', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance),
    postFindOne: async () => null,
  });

  const result = await JournalService.shareJournalToPost('journal-id', 'owner-id');

  assert.equal(state.postCreateCalls.length, 1);
  assert.deepEqual(state.postCreateCalls[0].data, {
    user_id: 'owner-id',
    journal_id: 'journal-id',
    site_id: 'site-id',
    title: 'Journal title',
    content: 'Journal content',
    image_urls: ['https://cdn.example.com/image-1.jpg'],
    audio_url: 'https://cdn.example.com/audio.mp3',
    video_url: 'https://cdn.example.com/video.mp4',
    status: 'published',
  });
  assert.equal(result.id, 'post-id');
  assert.equal(state.infoLogs[0][0], 'Journal journal-id shared to community by user owner-id: Post post-id');
});

test('UTCID02: shareJournalToPost throws when journal does not exist', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.shareJournalToPost('missing-journal-id', 'owner-id'),
    { message: 'Journal not found' }
  );

  assert.equal(state.errorLogs[0][0], 'Share journal error:');
});

test('UTCID03: shareJournalToPost throws forbidden when requester is not owner', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      user_id: 'other-owner-id',
    }),
  });

  await assert.rejects(
    JournalService.shareJournalToPost('journal-id', 'owner-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs[0][0], 'Share journal error:');
});

test('UTCID04: shareJournalToPost throws when journal has already been shared', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance),
    postFindOne: async () => ({
      id: 'existing-post-id',
      journal_id: 'journal-id',
      is_active: true,
    }),
  });

  await assert.rejects(
    JournalService.shareJournalToPost('journal-id', 'owner-id'),
    { message: 'This journal has already been shared to the community' }
  );

  assert.equal(state.errorLogs[0][0], 'Share journal error:');
});

test('UTCID05: shareJournalToPost maps Sequelize unique constraint to duplicate share error', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance),
    postFindOne: async () => null,
    postCreate: async () => {
      const error = new Error('duplicate key');
      error.name = 'SequelizeUniqueConstraintError';
      throw error;
    },
  });

  await assert.rejects(
    JournalService.shareJournalToPost('journal-id', 'owner-id'),
    { message: 'This journal has already been shared to the community' }
  );

  assert.equal(state.errorLogs.length, 0);
});
