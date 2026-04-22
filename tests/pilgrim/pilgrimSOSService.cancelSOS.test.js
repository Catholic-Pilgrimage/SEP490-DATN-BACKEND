const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadPilgrimSOSService,
  createUserRecord,
  createPlannerRecord,
} = require('./_sosTestHelper');

test('UTCID01: cancelSOS cancels a pending SOS and broadcasts to active planner chats', async () => {
  const { PilgrimSOSService, state, createSOSRecord } = loadPilgrimSOSService({
    sosFindOne: async () => createSOSRecord({
      id: 'sos-1',
      code: 'SOS0410001',
      status: 'pending',
      user_id: 'user-id',
    }),
    plannerMemberFindAll: async (options) => {
      if (options.where?.user_id === 'user-id') {
        return [
          { planner: createPlannerRecord({ id: 'planner-1' }) },
          { planner: createPlannerRecord({ id: 'planner-1' }) },
        ];
      }
      return [];
    },
    plannerFindAll: async () => [
      createPlannerRecord({ id: 'planner-2', user_id: 'user-id' }),
    ],
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim One',
    }),
  });

  const result = await PilgrimSOSService.cancelSOS('user-id', 'sos-1');

  assert.deepEqual(state.sosFindOneCalls[0].where, {
    id: 'sos-1',
    user_id: 'user-id',
  });
  assert.deepEqual(state.sosUpdateCalls[0].values, {
    status: 'cancelled',
  });
  assert.equal(result.status, 'cancelled');
  assert.equal(state.plannerChatCalls.length, 2);
  assert.deepEqual(
    state.plannerChatCalls.map((call) => call.plannerId).sort(),
    ['planner-1', 'planner-2']
  );
  assert.equal(state.infoLogs.length, 1);
  assert.ok(String(state.infoLogs[0][0]).includes('SOS SOS0410001 cancelled by user user-id'));
});

test('UTCID02: cancelSOS cancels a pending SOS even when the pilgrim has no ongoing planner trip', async () => {
  const { PilgrimSOSService, state, createSOSRecord } = loadPilgrimSOSService({
    sosFindOne: async () => createSOSRecord({
      id: 'sos-2',
      code: 'SOS0410002',
      status: 'pending',
      user_id: 'user-id',
    }),
    plannerMemberFindAll: async () => [],
    plannerFindAll: async () => [],
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Two',
    }),
  });

  const result = await PilgrimSOSService.cancelSOS('user-id', 'sos-2');

  assert.equal(result.status, 'cancelled');
  assert.equal(state.plannerChatCalls.length, 0);
  assert.equal(state.errorLogs.length, 0);
});

test('UTCID03: cancelSOS throws not_found when the SOS request does not exist', async () => {
  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindOne: async () => null,
  });

  await assert.rejects(
    PilgrimSOSService.cancelSOS('user-id', 'missing-sos-id'),
    { message: 'not_found' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Cancel SOS error:');
});

test('UTCID04: cancelSOS throws cannot_cancel when the SOS is no longer pending', async () => {
  const { PilgrimSOSService, state, createSOSRecord } = loadPilgrimSOSService({
    sosFindOne: async () => createSOSRecord({
      id: 'sos-4',
      code: 'SOS0410004',
      status: 'accepted',
      user_id: 'user-id',
    }),
  });

  await assert.rejects(
    PilgrimSOSService.cancelSOS('user-id', 'sos-4'),
    { message: 'cannot_cancel' }
  );

  assert.equal(state.sosUpdateCalls.length, 0);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Cancel SOS error:');
});

test('UTCID05: cancelSOS still succeeds when planner chat broadcast fails', async () => {
  const { PilgrimSOSService, state, createSOSRecord } = loadPilgrimSOSService({
    sosFindOne: async () => createSOSRecord({
      id: 'sos-5',
      code: 'SOS0410005',
      status: 'pending',
      user_id: 'user-id',
    }),
    plannerMemberFindAll: async () => [
      { planner: createPlannerRecord({ id: 'planner-5' }) },
    ],
    plannerFindAll: async () => [],
    userFindByPk: async () => createUserRecord({
      id: 'user-id',
      full_name: 'Pilgrim Five',
    }),
    sendSystemMessage: async () => {
      throw new Error('Chat unavailable');
    },
  });

  const result = await PilgrimSOSService.cancelSOS('user-id', 'sos-5');

  assert.equal(result.status, 'cancelled');
  assert.equal(state.sosUpdateCalls.length, 1);
  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Failed to broadcast cancel message to planner chat:');
  assert.equal(state.errorLogs[0][1].message, 'Chat unavailable');
});

test('UTCID06: cancelSOS logs and rethrows database errors', async () => {
  const record = {
    id: 'sos-6',
    code: 'SOS0410006',
    status: 'pending',
    user_id: 'user-id',
    update: async () => {
      throw new Error('Database unavailable');
    },
  };

  const { PilgrimSOSService, state } = loadPilgrimSOSService({
    sosFindOne: async () => record,
  });

  await assert.rejects(
    PilgrimSOSService.cancelSOS('user-id', 'sos-6'),
    { message: 'Database unavailable' }
  );

  assert.equal(state.errorLogs.length, 1);
  assert.equal(state.errorLogs[0][0], 'Cancel SOS error:');
  assert.equal(state.errorLogs[0][1].message, 'Database unavailable');
});
