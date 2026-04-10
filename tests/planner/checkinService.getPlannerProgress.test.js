const test = require('node:test');
const assert = require('node:assert/strict');

const { loadCheckinService } = require('./_checkinTestHelper');

function createPlanner(data = {}) {
  return {
    id: 'planner-id',
    user_id: 'owner-id',
    status: 'ongoing',
    ...data,
  };
}

test('UTCID01: getPlannerProgress returns aggregated progress for owner', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => createPlanner(),
    plannerItemFindAll: async () => [
      { id: 'item-1', status: 'visited', skipped_at: null, skip_reason: null, site: { id: 'site-1', name: 'La Vang', code: 'S001' } },
      { id: 'item-2', status: 'skipped', skipped_at: new Date('2026-04-08T09:00:00.000Z'), skip_reason: 'Weather', site: { id: 'site-2', name: 'Tra Kieu', code: 'S002' } },
    ],
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [
      { user_id: 'owner-id', planner_item_id: 'item-1', status: 'checked_in', checkin_date: new Date('2026-04-08T08:00:00.000Z'), photo_url: 'photo-owner' },
      { user_id: 'member-1', planner_item_id: 'item-1', status: 'checked_in', checkin_date: new Date('2026-04-08T08:05:00.000Z'), photo_url: 'photo-member' },
      { user_id: 'member-1', planner_item_id: 'item-3', status: 'missed', checkin_date: null, photo_url: null },
    ],
  });

  const result = await CheckinService.getPlannerProgress('planner-id', 'owner-id');

  assert.equal(result.planner_status, 'ongoing');
  assert.equal(result.total_items, 2);
  assert.equal(result.total_members, 2);
  assert.equal(result.member_progress.length, 2);
  assert.equal(result.member_progress[0].user_id, 'owner-id');
  assert.equal(result.member_progress[0].checked_in, 1);
  assert.equal(result.member_progress[0].skipped_by_planner, 1);
  assert.equal(result.member_progress[0].completed, 2);
  assert.equal(result.member_progress[0].percent, 100);
});

test('UTCID02: getPlannerProgress allows joined member to view planner progress', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => createPlanner(),
    plannerMemberFindOne: async () => ({ user_id: 'member-1', planner_id: 'planner-id', join_status: 'joined', deposit_status: 'paid' }),
    plannerItemFindAll: async () => [
      { id: 'item-1', status: 'upcoming', skipped_at: null, skip_reason: null, site: { id: 'site-1', name: 'La Vang', code: 'S001' } },
    ],
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [],
  });

  const result = await CheckinService.getPlannerProgress('planner-id', 'member-1');

  assert.equal(result.total_members, 2);
  assert.equal(result.member_progress[1].user_id, 'member-1');
  assert.equal(result.member_progress[1].percent, 0);
});

test('UTCID02A: getPlannerProgress allows dropped-out member with penalized deposit to view progress read-only', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => createPlanner(),
    plannerMemberFindOne: async () => ({
      user_id: 'former-member',
      planner_id: 'planner-id',
      join_status: 'dropped_out',
      deposit_status: 'penalized',
    }),
    plannerItemFindAll: async () => [
      { id: 'item-1', status: 'visited', skipped_at: null, skip_reason: null, site: { id: 'site-1', name: 'La Vang', code: 'S001' } },
    ],
    plannerMemberFindAll: async () => [{ user_id: 'member-1' }],
    userCheckinFindAll: async () => [],
  });

  const result = await CheckinService.getPlannerProgress('planner-id', 'former-member');

  assert.equal(result.total_members, 2);
  assert.equal(result.member_progress[0].user_id, 'owner-id');
});

test('UTCID03: getPlannerProgress throws when planner does not exist', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => null,
  });

  await assert.rejects(
    CheckinService.getPlannerProgress('missing-planner-id', 'owner-id'),
    { message: 'Planner not found' }
  );
});

test('UTCID04: getPlannerProgress throws when requester has no permission', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => createPlanner(),
    plannerMemberFindOne: async () => null,
  });

  await assert.rejects(
    CheckinService.getPlannerProgress('planner-id', 'outsider-id'),
    { message: 'You do not have permission to view this progress' }
  );
});

test('UTCID05: getPlannerProgress returns empty progress safely when planner has no items', async () => {
  const { CheckinService } = loadCheckinService({
    plannerFindByPk: async () => createPlanner({ status: 'planning' }),
    plannerItemFindAll: async () => [],
    plannerMemberFindAll: async () => [],
    userCheckinFindAll: async () => [],
  });

  const result = await CheckinService.getPlannerProgress('planner-id', 'owner-id');

  assert.equal(result.planner_status, 'planning');
  assert.equal(result.total_items, 0);
  assert.equal(result.total_members, 1);
  assert.equal(result.member_progress[0].percent, 0);
  assert.deepEqual(result.member_progress[0].history, []);
});
