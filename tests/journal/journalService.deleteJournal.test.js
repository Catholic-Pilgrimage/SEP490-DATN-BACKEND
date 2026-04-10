const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(createJournalInstance, data = {}) {
  return createJournalInstance({
    id: 'journal-id',
    user_id: 'owner-id',
    is_active: true,
    title: 'Journal title',
    content: 'Journal content',
    ...data,
  });
}

test('UTCID01: deleteJournal soft deletes active journal successfully', async () => {
  let journalRecord;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => {
      journalRecord = createJournalRow(createJournalInstance);
      return journalRecord;
    },
  });

  const result = await JournalService.deleteJournal('journal-id', 'owner-id');

  assert.equal(state.journalUpdateCalls.length, 1);
  assert.deepEqual(state.journalUpdateCalls[0].values, {
    is_active: false,
  });
  assert.deepEqual(result, {
    id: 'journal-id',
    message: 'Journal deleted successfully',
  });
  assert.equal(state.infoLogs.length, 1);
  assert.equal(state.infoLogs[0][0], 'Journal logically deleted by user owner-id: journal-id');
});

test('UTCID02: deleteJournal throws when journal does not exist', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.deleteJournal('missing-journal-id', 'owner-id'),
    { message: 'Journal not found' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Delete journal error:');
});

test('UTCID03: deleteJournal throws forbidden when requester is not owner', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      user_id: 'other-owner-id',
    }),
  });

  await assert.rejects(
    JournalService.deleteJournal('journal-id', 'owner-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Delete journal error:');
});
