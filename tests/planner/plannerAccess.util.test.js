const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const MODULES = {
  TARGET: path.join(ROOT, 'utils', 'plannerAccess.util.js'),
  MODELS: path.join(ROOT, 'models', 'index.js'),
};

function setMock(modulePath, exports) {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function clearModules() {
  Object.values(MODULES).forEach((modulePath) => {
    delete require.cache[modulePath];
  });
}

function loadPlannerAccess(overrides = {}) {
  clearModules();

  setMock(MODULES.MODELS, {
    PlannerMember: {
      findOne: async (options) => {
        if (overrides.plannerMemberFindOne) {
          return overrides.plannerMemberFindOne(options);
        }
        return null;
      },
    },
  });

  return require(MODULES.TARGET);
}

test('UTPAC01: checkPlannerAccess grants full access to joined member', async () => {
  const { checkPlannerAccess } = loadPlannerAccess({
    plannerMemberFindOne: async () => ({
      planner_id: 'planner-id',
      user_id: 'joined-user',
      join_status: 'joined',
      deposit_status: 'paid',
    }),
  });

  const access = await checkPlannerAccess('planner-id', 'joined-user', 'owner-id');

  assert.deepEqual(access, {
    can_view: true,
    is_read_only: false,
    viewer_join_status: 'joined',
    viewer_deposit_status: 'paid',
  });
});

test('UTPAC02: checkPlannerAccess grants read-only access to dropped-out member with refund', async () => {
  const { checkPlannerAccess } = loadPlannerAccess({
    plannerMemberFindOne: async () => ({
      planner_id: 'planner-id',
      user_id: 'former-user',
      join_status: 'dropped_out',
      deposit_status: 'refunded',
    }),
  });

  const access = await checkPlannerAccess('planner-id', 'former-user', 'owner-id');

  assert.deepEqual(access, {
    can_view: true,
    is_read_only: true,
    viewer_join_status: 'dropped_out',
    viewer_deposit_status: 'refunded',
  });
});

test('UTPAC03: checkPlannerAccess denies kicked member', async () => {
  const { checkPlannerAccess } = loadPlannerAccess({
    plannerMemberFindOne: async () => ({
      planner_id: 'planner-id',
      user_id: 'kicked-user',
      join_status: 'kicked',
      deposit_status: 'refunded',
    }),
  });

  const access = await checkPlannerAccess('planner-id', 'kicked-user', 'owner-id');

  assert.deepEqual(access, {
    can_view: false,
    is_read_only: true,
    viewer_join_status: 'kicked',
    viewer_deposit_status: 'refunded',
  });
});
