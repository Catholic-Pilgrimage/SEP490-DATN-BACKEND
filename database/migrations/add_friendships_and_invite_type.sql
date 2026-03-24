-- ============================================
-- MIGRATION: Add Friendships & Friend Invite Support
-- Run this on existing databases that already have planner_invites table
-- ============================================

-- 1. Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_not_self CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Canonical unique: prevent both A->B and B->A from existing
CREATE UNIQUE INDEX IF NOT EXISTS uq_friendships_pair
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Add invite_type and invitee_user_id to planner_invites
ALTER TABLE planner_invites
    ADD COLUMN IF NOT EXISTS invite_type VARCHAR(20) NOT NULL DEFAULT 'external';

ALTER TABLE planner_invites
    ADD COLUMN IF NOT EXISTS invitee_user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add constraint (only if not exists)
DO $$ BEGIN
    ALTER TABLE planner_invites
        ADD CONSTRAINT chk_planner_invite_type CHECK (invite_type IN ('friend', 'external'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_planner_invites_type ON planner_invites(invite_type);
CREATE INDEX IF NOT EXISTS idx_planner_invites_invitee_user ON planner_invites(invitee_user_id);

-- 3. Add new notification types to enum if using enum (this project uses VARCHAR, so no migration needed for notifications)
