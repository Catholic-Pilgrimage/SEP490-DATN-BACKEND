const test = require('node:test');
const assert = require('node:assert/strict');

const { loadJournalService } = require('./_journalTestHelper');

function createJournalRow(createJournalInstance, data = {}) {
  return createJournalInstance({
    id: 'journal-id',
    user_id: 'owner-id',
    is_active: false,
    title: 'Archived journal',
    content: 'Archived content',
    planner_id: 'planner-id',
    planner_item_id: ['item-1'],
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
    is_active: journal.is_active,
    planner_id: journal.planner_id,
    planner_item_id: journal.planner_item_id,
    title: journal.title,
  });
}

test('UTCID01: restoreJournal restores archived point journal successfully', async () => {
  let journalRecord;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => {
      journalRecord = createJournalRow(createJournalInstance, {
        planner_id: 'planner-id',
        planner_item_id: ['item-1'],
      });
      return journalRecord;
    },
    journalFindByPk: async () => journalRecord,
  });

  JournalService.findExistingPointJournal = async () => null;
  stubBuildJournalResponse(JournalService);

  const result = await JournalService.restoreJournal('journal-id', 'owner-id');

  assert.equal(state.journalUpdateCalls.length, 1);
  assert.deepEqual(state.journalUpdateCalls[0].values, {
    is_active: true,
  });
  assert.equal(result.id, 'journal-id');
  assert.equal(result.is_active, true);
  assert.equal(state.infoLogs[0][0], 'Journal restored by user owner-id: journal-id');
});

test('UTCID02: restoreJournal restores archived summary journal successfully', async () => {
  let journalRecord;
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => {
      journalRecord = createJournalRow(createJournalInstance, {
        planner_id: 'planner-2',
        planner_item_id: [],
      });
      return journalRecord;
    },
    journalFindByPk: async () => journalRecord,
  });

  JournalService.findExistingSummaryJournal = async () => null;
  stubBuildJournalResponse(JournalService);

  const result = await JournalService.restoreJournal('journal-id', 'owner-id');

  assert.equal(state.journalUpdateCalls.length, 1);
  assert.equal(state.journalUpdateCalls[0].values.is_active, true);
  assert.equal(result.planner_id, 'planner-2');
  assert.deepEqual(result.planner_item_id, []);
});

test('UTCID03: restoreJournal throws when journal does not exist', async () => {
  const { JournalService, state } = loadJournalService({
    journalFindOne: async () => null,
  });

  await assert.rejects(
    JournalService.restoreJournal('missing-journal-id', 'owner-id'),
    { message: 'Journal not found' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Restore journal error:');
});

test('UTCID04: restoreJournal throws forbidden when requester is not owner', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      user_id: 'other-owner-id',
    }),
  });

  await assert.rejects(
    JournalService.restoreJournal('journal-id', 'owner-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Restore journal error:');
});

test('UTCID05: restoreJournal throws when journal is already active', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      is_active: true,
    }),
  });

  await assert.rejects(
    JournalService.restoreJournal('journal-id', 'owner-id'),
    { message: 'Journal is already active' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Restore journal error:');
});

test('UTCID06: restoreJournal throws when another active point journal already exists for the visit', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      planner_id: 'planner-id',
      planner_item_id: ['item-1'],
    }),
  });

  JournalService.findExistingPointJournal = async () => ({
    id: 'active-point-journal-id',
  });

  await assert.rejects(
    JournalService.restoreJournal('journal-id', 'owner-id'),
    (error) => {
      assert.equal(error.message, 'Another active journal already exists for this visit.');
      assert.deepEqual(error.details, {
        journal_id: 'active-point-journal-id',
      });
      return true;
    }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Restore journal error:');
});

test('UTCID07: restoreJournal throws when another active summary already exists for the journey', async () => {
  const { JournalService, state, createJournalInstance } = loadJournalService({
    journalFindOne: async () => createJournalRow(createJournalInstance, {
      planner_id: 'planner-2',
      planner_item_id: [],
    }),
  });

  JournalService.findExistingSummaryJournal = async () => ({
    id: 'active-summary-journal-id',
  });

  await assert.rejects(
    JournalService.restoreJournal('journal-id', 'owner-id'),
    (error) => {
      assert.equal(error.message, 'Another active summary already exists for this journey.');
      assert.deepEqual(error.details, {
        journal_id: 'active-summary-journal-id',
      });
      return true;
    }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Restore journal error:');
});
