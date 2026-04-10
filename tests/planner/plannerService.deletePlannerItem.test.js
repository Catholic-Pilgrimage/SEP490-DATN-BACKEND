const test = require('node:test');
const assert = require('node:assert/strict');

const { loadPlannerService } = require('./_plannerTestHelper');

function createPlannerRecord(factory, data = {}) {
  return factory({
    id: 'planner-id',
    user_id: 'owner-id',
    name: 'Pilgrimage Plan',
    start_date: '2026-04-10',
    end_date: '2026-04-12',
    number_of_people: 2,
    transportation: 'bus',
    deposit_amount: 300000,
    penalty_percentage: 15,
    status: 'planning',
    is_active: true,
    ...data,
  });
}

function createPlannerItemRecord(data = {}, destroyCalls = []) {
  return {
    id: 'item-id',
    planner_id: 'planner-id',
    leg_number: 1,
    order_index: 2,
    status: 'upcoming',
    destroy: async (options) => {
      destroyCalls.push(options);
      return true;
    },
    ...data,
  };
}

test('UTCID01: deletePlannerItem deletes upcoming item and reorders remaining items', async () => {
  const destroyCalls = [];
  const item = createPlannerItemRecord({}, destroyCalls);

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
    plannerItemCount: async () => 2,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: false,
  });

  const result = await PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id');

  assert.equal(result.id, 'item-id');
  assert.equal(result.message, 'Item deleted successfully');
  assert.equal(destroyCalls.length, 1);
  assert.equal(state.plannerItemDecrementCalls.length, 1);
  assert.deepEqual(state.plannerItemDecrementCalls[0].options.where, {
    planner_id: 'planner-id',
    leg_number: 1,
    order_index: { [require('sequelize').Op.gt]: 2 },
  });
  assert.equal(state.transactionCommitCalls, 1);
  assert.equal(state.transactionRollbackCalls, 0);
});

test('UTCID02: deletePlannerItem blocks deletion that would make shared planner incomplete', async () => {
  const item = createPlannerItemRecord({ leg_number: 2 });

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
    plannerItemCount: async () => 1,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: true,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Cannot make planner incomplete after sharing', missingDays: [2] }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID03: deletePlannerItem throws planner not found when planner does not exist', async () => {
  const { PlannerService, state } = loadPlannerService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Planner not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID04: deletePlannerItem throws forbidden when requester is not planner owner', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'other-user-id', 'item-id'),
    { message: 'Forbidden' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID05: deletePlannerItem throws when planner is locked', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: true,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Planner is locked' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID06: deletePlannerItem throws when item does not exist', async () => {
  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => null,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'missing-item-id'),
    { message: 'Item not found' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID07: deletePlannerItem blocks deletion in ongoing planner', async () => {
  const item = createPlannerItemRecord();

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance, {
      status: 'ongoing',
    }),
    plannerItemFindByPk: async () => item,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Cannot delete ongoing journey' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID08: deletePlannerItem blocks deletion of visited item', async () => {
  const item = createPlannerItemRecord({ status: 'visited' });

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Cannot delete visited site' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});

test('UTCID09: deletePlannerItem throws when item does not belong to planner', async () => {
  const item = createPlannerItemRecord({ planner_id: 'another-planner-id' });

  const { PlannerService, state, createPlannerInstance } = loadPlannerService({
    plannerFindByPk: async () => createPlannerRecord(createPlannerInstance),
    plannerItemFindByPk: async () => item,
  });

  PlannerService.getPlannerState = async () => ({
    editLocked: false,
    hasSharedCommitment: false,
  });

  await assert.rejects(
    PlannerService.deletePlannerItem('planner-id', 'owner-id', 'item-id'),
    { message: 'Item does not belong to this planner' }
  );

  assert.equal(state.transactionRollbackCalls, 1);
  assert.equal(state.errorLogs[0][0], 'Delete planner item error:');
});
