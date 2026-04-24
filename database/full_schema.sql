-- ============================================
-- CATHOLIC PILGRIMAGE GUIDE APP - DATABASE SCHEMA

-- ============================================

-- ============================================
-- DROP ALL TABLES & RESET DATABASE (Uncomment when needed)
-- ============================================
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENUM TYPES
-- ============================================
DO $$ BEGIN
    -- User & Auth
    CREATE TYPE user_role AS ENUM ('admin', 'pilgrim', 'local_guide', 'manager');
    CREATE TYPE user_status AS ENUM ('active', 'banned');
    
    -- Sites
    CREATE TYPE site_region AS ENUM ('Bac', 'Trung', 'Nam');
    CREATE TYPE site_type AS ENUM ('church', 'shrine', 'monastery', 'center', 'other');
    CREATE TYPE media_type AS ENUM ('image', 'video', 'model_3d');
    CREATE TYPE site_content_status AS ENUM ('pending', 'approved', 'rejected');
    
    -- Nearby Places (NEW)
    CREATE TYPE nearby_place_category AS ENUM ('food', 'lodging', 'medical');
    CREATE TYPE nearby_place_status AS ENUM ('pending', 'approved', 'rejected');
    
    -- Planner
    CREATE TYPE planner_status AS ENUM ('planning', 'locked', 'ongoing', 'completed', 'cancelled');
    CREATE TYPE planner_item_status AS ENUM ('upcoming', 'visited', 'skipped');

    CREATE TYPE checkin_status AS ENUM ('checked_in', 'missed', 'pending');

    
    -- Journal & Community
    CREATE TYPE journal_privacy AS ENUM ('private', 'public');
    CREATE TYPE content_status AS ENUM ('draft', 'published', 'pending', 'approved', 'rejected');
    -- Others
    CREATE TYPE report_reason AS ENUM ('spam', 'harassment', 'hate_speech', 'false_information', 'violence', 'inappropriate', 'scam', 'other');
    CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'reject', 'cancelled');
    CREATE TYPE sos_status AS ENUM ('pending', 'accepted', 'resolved', 'cancelled');
    CREATE TYPE invite_status AS ENUM ('pending', 'awaiting_payment', 'accepted', 'rejected', 'expired');

    
    -- Verification (Manager Application)
    CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
    
    -- Site Content Status (for mass_schedules, events)
    CREATE TYPE site_status AS ENUM ('pending', 'approved', 'rejected');
    
    -- Push Notifications
    CREATE TYPE push_token_status AS ENUM ('active', 'revoked', 'expired');
    
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'local_guide';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE planner_status ADD VALUE IF NOT EXISTS 'locked';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Auto-update likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CORE TABLES
-- ============================================

-- ============================================
-- 1. USERS TABLE (FIRST - no dependencies)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    role user_role NOT NULL DEFAULT 'pilgrim',
    status user_status NOT NULL DEFAULT 'active',
    language VARCHAR(5) NOT NULL DEFAULT 'vi',
    
    -- NEW: Simplified Manager/Guide management
    site_id UUID, -- Will add FK after sites table created
    verified_at TIMESTAMP WITH TIME ZONE, -- For managers
    
    -- Manager Transition: Local Guide inheritance tracking
    inherited_from UUID, -- Previous manager who created/managed this Local Guide
    inherited_at TIMESTAMP WITH TIME ZONE, -- When this Local Guide was inherited
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_site ON users(site_id) WHERE site_id IS NOT NULL;

-- Trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. SITES TABLE (SECOND - before FK references)
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE, -- Auto-generated: CHNAM001, SHBAC001, etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    history TEXT,
    address TEXT,
    province VARCHAR(100),
    district VARCHAR(100),
    latitude DECIMAL(9,6) CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
    longitude DECIMAL(9,6) CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    region site_region NOT NULL,
    type site_type NOT NULL,
    patron_saint VARCHAR(255),
    cover_image TEXT,
    opening_hours JSONB, -- { open: "06:00", close: "18:00" }
    contact_info JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_code ON sites(code);
CREATE INDEX IF NOT EXISTS idx_sites_name_trgm ON sites USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sites_search ON sites(name, province, district);
CREATE INDEX IF NOT EXISTS idx_sites_coords ON sites(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sites_region_type ON sites(region, type);
CREATE INDEX IF NOT EXISTS idx_sites_is_active ON sites(is_active);

-- Trigger
DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Now add FK from users to sites
ALTER TABLE users
ADD CONSTRAINT fk_users_site
FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;

-- Constraint: Only 1 manager per site
CREATE UNIQUE INDEX IF NOT EXISTS uq_manager_site 
ON users(site_id) 
WHERE role = 'manager';

-- Constraint: Role-Site validation rules
-- manager CAN have site_id (creates after verification)
-- local_guide MUST have site_id
-- pilgrim MUST NOT have site_id
-- admin can have or not
ALTER TABLE users
ADD CONSTRAINT chk_users_role_site
CHECK (
  (role::text = 'manager')
  OR (role::text = 'local_guide' AND site_id IS NOT NULL)
  OR (role::text = 'pilgrim' AND site_id IS NULL)
  OR (role::text = 'admin')
);

-- ============================================
-- 3. AUTH & SECURITY TABLES
-- ============================================

-- 3.1 Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- 3.2 Blacklisted Tokens
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3.4 User Push Tokens (Expo Notifications)
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expo_token VARCHAR(255) NOT NULL, -- ExponentPushToken[xxxx]
    device_id VARCHAR(255), -- Optional: để phân biệt nhiều máy
    platform VARCHAR(50) CHECK (platform IN ('ios', 'android', 'web')), -- Validate platform
    status push_token_status DEFAULT 'active',
    last_used_at TIMESTAMP WITH TIME ZONE, -- Track last successful notification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_push_tokens_expo ON user_push_tokens(expo_token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_status ON user_push_tokens(status) WHERE status = 'active'; -- Partial index
CREATE INDEX IF NOT EXISTS idx_push_tokens_device ON user_push_tokens(user_id, device_id) WHERE device_id IS NOT NULL;

-- Trigger for user_push_tokens
DROP TRIGGER IF EXISTS update_user_push_tokens_updated_at ON user_push_tokens;
CREATE TRIGGER update_user_push_tokens_updated_at
    BEFORE UPDATE ON user_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3.5 WALLETS & TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
    locked_balance DECIMAL(15, 2) DEFAULT 0 NOT NULL CHECK (locked_balance >= 0),
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'locked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON wallets(status);

-- Trigger for wallets
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'topup',
        'withdraw',
        'escrow_lock',
        'escrow_refund',
        'penalty_applied',
        'penalty_received',
        'penalty_refunded'
    )),
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    description TEXT,
    bank_info VARCHAR(500),
    code VARCHAR(20) UNIQUE,    -- Mã GD dạng TXNYYYYMMDDXXXXXX (vd: TXN20260318A3F7K2)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(code);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- Trigger for transactions
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3.6 VERIFICATION REQUESTS (Manager Application)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for guest registration
    code VARCHAR(10) UNIQUE, -- Auto-generated: VR001, VR002...
    
    -- Guest applicant info (when user_id is NULL)
    applicant_email VARCHAR(255),
    applicant_name VARCHAR(255),
    applicant_phone VARCHAR(20),
    
    -- Basic site info (for Admin to review)
    site_name VARCHAR(255), -- Made nullable for transition requests
    site_address TEXT,
    site_province VARCHAR(100), -- Made nullable for transition requests
    site_type site_type,
    site_region site_region,
    
    -- Manager Transition: For requesting to manage existing site
    existing_site_id UUID REFERENCES sites(id) ON DELETE SET NULL, -- If set, requesting to manage existing site
    transition_reason TEXT, -- Reason for requesting to replace current manager
    old_manager_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Tracks the previous manager who was replaced
    
    -- Proof documents
    certificate_url TEXT,
    introduction TEXT,
    
    -- Status & Review
    status verification_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);

-- Unique: Chỉ 1 pending request per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_verification_requests_user_pending
ON verification_requests(user_id) WHERE status = 'pending';

-- Constraint: Khi rejected phải có lý do
ALTER TABLE verification_requests
ADD CONSTRAINT chk_verification_rejection
CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL);

-- Trigger
DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER update_verification_requests_updated_at
    BEFORE UPDATE ON verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- ============================================
-- 5. SITE MODULE TABLES
-- ============================================

-- 5.1 Site Media
CREATE TABLE IF NOT EXISTS site_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    type media_type DEFAULT 'image',
    caption VARCHAR(255),
    status site_content_status DEFAULT 'pending',
    rejection_reason VARCHAR(500),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Narrative fields
    audio_url TEXT,
    narration_text TEXT,
    narrative_status VARCHAR(20),
    narrative_rejection_reason TEXT,
    narrative_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    narrative_reviewed_at TIMESTAMP WITH TIME ZONE,

    is_active BOOLEAN DEFAULT TRUE,
    is_main BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id);
CREATE INDEX IF NOT EXISTS idx_site_media_status ON site_media(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_media_main
ON site_media(site_id)
WHERE is_main = TRUE;

-- 5.2 Mass Schedules
CREATE TABLE IF NOT EXISTS mass_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(15) UNIQUE NOT NULL,
    days_of_week INT[] NOT NULL DEFAULT '{}',
    time TIME NOT NULL,
    note TEXT,
    status site_content_status DEFAULT 'pending',
    rejection_reason VARCHAR(500),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mass_schedules_site ON mass_schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_mass_schedules_status ON mass_schedules(status);

-- 5.3 Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    banner_url TEXT,
    category VARCHAR(100),
    status site_content_status DEFAULT 'pending',
    rejection_reason VARCHAR(500),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    time_state VARCHAR(50) DEFAULT 'upcoming',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_events_site ON events(site_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_time_state ON events(time_state);



-- ============================================
-- 6. GUIDE SHIFT SUBMISSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS guide_shift_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guide_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    week_start_date DATE NOT NULL,
    
    -- Submission metadata
    submission_type VARCHAR(20) DEFAULT 'new' CHECK (submission_type IN ('new', 'update')),
    change_reason TEXT,
    previous_submission_id UUID REFERENCES guide_shift_submissions(id),
    
    -- Approval status
    status VARCHAR(15) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    total_shifts INT DEFAULT 0,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_guide ON guide_shift_submissions(guide_id);
CREATE INDEX IF NOT EXISTS idx_submissions_site ON guide_shift_submissions(site_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON guide_shift_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON guide_shift_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_submissions_code ON guide_shift_submissions(code);

-- Constraint: Only 1 active approved submission per guide per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_approved_per_week 
    ON guide_shift_submissions(guide_id, site_id, week_start_date) 
    WHERE is_active = TRUE AND status = 'approved';

-- Trigger
DROP TRIGGER IF EXISTS update_guide_shift_submissions_updated_at ON guide_shift_submissions;
CREATE TRIGGER update_guide_shift_submissions_updated_at
    BEFORE UPDATE ON guide_shift_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6.1 GUIDE SHIFTS (Belongs to Submission)
-- ============================================
CREATE TABLE IF NOT EXISTS guide_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES guide_shift_submissions(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guide_shifts_submission ON guide_shifts(submission_id);
CREATE INDEX IF NOT EXISTS idx_guide_shifts_day ON guide_shifts(day_of_week);

-- ============================================
-- 6.5 FRIENDSHIPS
-- ============================================
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

-- Trigger
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. PLANNER MODULE
-- ============================================
CREATE TABLE IF NOT EXISTS planners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE,                             -- Ngày bắt đầu
    end_date DATE,                               -- Ngày kết thúc
    number_of_people INT DEFAULT 1,
    min_people_required INT DEFAULT 1,
    transportation VARCHAR(100),
    deposit_amount DECIMAL(15, 2) DEFAULT NULL CHECK (deposit_amount IS NULL OR deposit_amount >= 2000),
    penalty_percentage INTEGER DEFAULT NULL CHECK (penalty_percentage IS NULL OR (penalty_percentage >= 0 AND penalty_percentage <= 50)),
    status planner_status DEFAULT 'planning',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_reason TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    lock_duration_hours INTEGER DEFAULT 24,
    edit_lock_at TIMESTAMP WITH TIME ZONE,
    is_locked BOOLEAN DEFAULT FALSE,
    last_closed_day INTEGER DEFAULT 0 CHECK (last_closed_day >= 0),
    continuation_of_id UUID REFERENCES planners(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_planner_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_planners_people_bounds CHECK (min_people_required >= 1 AND min_people_required <= number_of_people)
);

CREATE INDEX IF NOT EXISTS idx_planners_user ON planners(user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_planners_updated_at ON planners;
CREATE TRIGGER update_planners_updated_at
    BEFORE UPDATE ON planners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS planner_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(100) NOT NULL,

    invite_type VARCHAR(20) NOT NULL DEFAULT 'external'
        CHECK (invite_type IN ('friend', 'external')),
    invitee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    status invite_status DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_planner_invites_token ON planner_invites(token);
CREATE INDEX IF NOT EXISTS idx_planner_invites_type ON planner_invites(invite_type);
CREATE INDEX IF NOT EXISTS idx_planner_invites_invitee_user ON planner_invites(invitee_user_id);

CREATE TABLE IF NOT EXISTS planner_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    leg_number INT DEFAULT 1,
    order_index INT DEFAULT 1,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    status planner_item_status DEFAULT 'upcoming',
    note TEXT,
    -- NEW: Enhanced planning features
    nearby_amenity_ids UUID[], -- Array of nearby_place IDs (optional)
    estimated_time TIME, -- Giờ dự kiến đến địa điểm
    rest_duration INTERVAL, -- Thời gian nghỉ ngơi (e.g., '1 hour', '30 minutes')
    travel_time_minutes INT, -- Travel time from previous site in minutes
    skip_reason TEXT,
    skipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planner_items_planner ON planner_items(planner_id);
ALTER TABLE planner_items
ADD CONSTRAINT uq_planner_items_order UNIQUE (planner_id, leg_number, order_index);

DROP TRIGGER IF EXISTS update_planner_items_updated_at ON planner_items;
CREATE TRIGGER update_planner_items_updated_at
    BEFORE UPDATE ON planner_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS planner_members (
    planner_id UUID REFERENCES planners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    deposit_status VARCHAR(20) DEFAULT NULL CHECK (deposit_status IS NULL OR deposit_status IN ('paid', 'refunded', 'penalized')),
    join_status VARCHAR(20) DEFAULT 'joined' NOT NULL CHECK (join_status IN ('joined', 'dropped_out', 'kicked')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (planner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planner_members_deposit_status ON planner_members(deposit_status);
CREATE INDEX IF NOT EXISTS idx_planner_members_join_status ON planner_members(join_status);

-- 7.4 Planner Messages (Mini Chat)
CREATE TABLE IF NOT EXISTS planner_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planner_id UUID NOT NULL REFERENCES planners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    content TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_message_content CHECK (
        (message_type = 'text' AND content IS NOT NULL) OR
        (message_type = 'image' AND image_url IS NOT NULL) OR
        (message_type = 'system' AND content IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_planner_messages_planner ON planner_messages(planner_id);
CREATE INDEX IF NOT EXISTS idx_planner_messages_created ON planner_messages(planner_id, created_at DESC);

-- ============================================
-- 8. USER INTERACTIONS
-- ============================================

-- 8.1 Favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, site_id)
);

-- 8.2 Check-ins (UPDATED - planner-item-based with GPS validation)
CREATE TABLE IF NOT EXISTS user_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    
    planner_item_id UUID NOT NULL
        REFERENCES planner_items(id) ON DELETE CASCADE,
    
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    
    distance_meters INT,
    is_valid BOOLEAN DEFAULT false,
    
    status checkin_status DEFAULT 'checked_in', -- checked_in | skipped | missed
    checkin_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    photo_url TEXT,
    
    UNIQUE (user_id, planner_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_checkins_user ON user_checkins(user_id);

-- ============================================
-- 10. JOURNAL & COMMUNITY
-- ============================================

-- 10.1 Journals
CREATE TABLE IF NOT EXISTS journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT,
    image_url TEXT[],
    video_url TEXT,
    planner_id UUID REFERENCES planners(id) ON DELETE SET NULL,
    planner_item_id UUID[] DEFAULT ARRAY[]::UUID[],
    privacy journal_privacy DEFAULT 'private',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_site ON journals(site_id);
CREATE INDEX IF NOT EXISTS idx_journals_planner ON journals(planner_id) WHERE planner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journals_planner_item ON journals USING GIN(planner_item_id);
CREATE INDEX IF NOT EXISTS idx_journals_privacy ON journals(privacy) WHERE privacy = 'public';
CREATE INDEX IF NOT EXISTS idx_journals_active ON journals(is_active) WHERE is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS update_journals_updated_at ON journals;
CREATE TRIGGER update_journals_updated_at
    BEFORE UPDATE ON journals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10.3 Posts
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT,
    image_urls TEXT[],
    audio_url TEXT,
    video_url TEXT,
    journal_id UUID REFERENCES journals(id) ON DELETE SET NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    planner_id UUID REFERENCES planners(id) ON DELETE SET NULL,
    likes_count INT DEFAULT 0,
    status content_status DEFAULT 'published',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_journal ON posts(journal_id) WHERE journal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_site ON posts(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_planner ON posts(planner_id) WHERE planner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_user_journal_active
    ON posts(user_id, journal_id)
    WHERE journal_id IS NOT NULL AND is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_user_planner_active
    ON posts(user_id, planner_id)
    WHERE planner_id IS NOT NULL AND is_active = true;

-- Trigger
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- Trigger for syncing likes_count
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status content_status DEFAULT 'published',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_active ON post_comments(is_active) WHERE is_active = true;

-- ============================================
-- 11. MODERATION & REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reason report_reason NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    admin_note TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_active ON reports(reporter_id, is_active);

-- Trigger
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. SOS & EMERGENCY
-- ============================================
CREATE TABLE IF NOT EXISTS sos_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(15) UNIQUE, -- Auto-generated: SOS0129001
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    message TEXT,
    contact_phone VARCHAR(20),
    status sos_status DEFAULT 'pending',
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- LocalGuide who accepted
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    notes TEXT, -- Resolution notes
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sos_code ON sos_requests(code);
CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_sos_site ON sos_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_sos_user ON sos_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_assigned ON sos_requests(assigned_to) WHERE assigned_to IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sos_requests_updated_at ON sos_requests;
CREATE TRIGGER update_sos_requests_updated_at
    BEFORE UPDATE ON sos_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. NOTIFICATIONS (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(receiver_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 14. NEARBY PLACES (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS nearby_places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code VARCHAR(15) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category nearby_place_category NOT NULL,
    address TEXT,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    distance_meters INT,
    phone VARCHAR(20),
    description TEXT,
    image_url TEXT,
    status nearby_place_status DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nearby_places_site ON nearby_places(site_id);
CREATE INDEX IF NOT EXISTS idx_nearby_places_status ON nearby_places(status);
CREATE INDEX IF NOT EXISTS idx_nearby_places_category ON nearby_places(category);

-- Constraint: Distance ≤ 5km
ALTER TABLE nearby_places
ADD CONSTRAINT chk_nearby_distance
CHECK (distance_meters IS NULL OR distance_meters <= 5000);

-- ============================================
-- 15. OFFLINE SYNC LOGS (Idempotency Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_action_id VARCHAR(255) NOT NULL UNIQUE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('CHECK_IN', 'CREATE_JOURNAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'synced' CHECK (status IN ('synced', 'failed', 'skipped')),
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_logs_user ON offline_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_logs_client_action ON offline_sync_logs(client_action_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_logs_synced_at ON offline_sync_logs(synced_at);

-- ============================================
-- 16. REVIEWS & RATINGS
-- ============================================

-- 16.1 Site Reviews
CREATE TABLE IF NOT EXISTS site_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES user_checkins(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    verified_visit BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_reviews_site ON site_reviews(site_id);
CREATE INDEX IF NOT EXISTS idx_site_reviews_user ON site_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_site_reviews_rating ON site_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_site_reviews_active ON site_reviews(is_active) WHERE is_active = TRUE;

-- Constraint: 1 active review per user per site
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_reviews_user_site
ON site_reviews(user_id, site_id) WHERE is_active = TRUE;

-- Trigger
DROP TRIGGER IF EXISTS update_site_reviews_updated_at ON site_reviews;
CREATE TRIGGER update_site_reviews_updated_at
    BEFORE UPDATE ON site_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- 16.3 Site Review Replies (1 reply per review, by Local Guide/Manager)
CREATE TABLE IF NOT EXISTS site_review_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL UNIQUE REFERENCES site_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_review_replies_review ON site_review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_site_review_replies_user ON site_review_replies(user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_site_review_replies_updated_at ON site_review_replies;
CREATE TRIGGER update_site_review_replies_updated_at
    BEFORE UPDATE ON site_review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- ============================================
-- 17. AI CACHES
-- ============================================
CREATE TABLE IF NOT EXISTS ai_caches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature VARCHAR(50) NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    response_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_caches_feature_key ON ai_caches(feature, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_caches_expires ON ai_caches(expires_at);

-- Trigger
DROP TRIGGER IF EXISTS update_ai_caches_updated_at ON ai_caches;
CREATE TRIGGER update_ai_caches_updated_at
    BEFORE UPDATE ON ai_caches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 18. AI PROMPTS (Dynamic Prompt Management)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_key VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    instruction_text TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompts_key ON ai_prompts(prompt_key);

-- Trigger
DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON ai_prompts;
CREATE TRIGGER update_ai_prompts_updated_at
    BEFORE UPDATE ON ai_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 19. SEED DEFAULT AI PROMPTS
-- ============================================
INSERT INTO ai_prompts (prompt_key, description, instruction_text) VALUES
('route', 'AI Route Planner — generates optimal Catholic pilgrimage itinerary', 'You are an expert Catholic pilgrimage route planner in Vietnam.
Given these pilgrimage sites, suggest the optimal route.

Requirements:
- Organize into daily itinerary, grouping nearby sites (same region/province) on same day
- Use the provided distance data to estimate realistic travel times for Vietnam roads
- IMPORTANT: Review ''opening_hours'', ''mass_schedules'', and ''upcoming_events'' in the Sites JSON. Try to schedule visits to ALIGN with a Mass or an interesting Event when possible!
- Visit duration: shrine ~90min, church ~60min, monastery ~120min, center ~45min. Format as "Xh" or "XhYm" (e.g. "1h30m", "2h")
- Each stop needs an estimated arrival/start time in HH:mm format
- Add a short spiritual note for each stop (Vietnamese)
- Each item MUST have an order_index (1-based, sequential within each day)'),

('article', 'AI Article Writer — generates devotional article for pilgrimage sites', 'You are a Catholic content writer specializing in pilgrimage sites in Vietnam.
Write a devotional and inspiring article about the given topic.

Requirements:
- Structure: Clear introduction, structured body with subsections if needed, meaningful conclusion
- Include historical and spiritual significance
- If relevant, mention patron saints, miracles, or notable Catholic traditions
- Reference specific details from the site information provided'),

('review_summary', 'AI Review Summarizer — summarizes recent site reviews', 'You are a review analyst for a Catholic pilgrimage site in Vietnam.

Analyze these reviews and provide a structured summary. Focus on:
1. Overall impression from visitors
2. Key strengths mentioned repeatedly
3. Key weaknesses or areas for improvement
4. A concise overall summary (2-3 sentences)'),

('events', 'AI Event Recommender — suggests events aligned with liturgical calendar', 'You are a Catholic liturgical calendar expert and event planner for pilgrimage sites in Vietnam.

Based on the current date, determine the liturgical season and suggest NEW and UNIQUE event ideas that don''t overlap with existing events.

IMPORTANT: The output must use these EXACT field names to be compatible with our Event API.

For each event provide data that can be directly used to create an event:
- name: Event name in Vietnamese (max 255 chars)
- description: Detailed description in Vietnamese (2-4 sentences)
- start_date: YYYY-MM-DD format (must be in the future)
- end_date: YYYY-MM-DD format (same as start_date for single-day events, or later for multi-day)
- start_time: HH:mm:ss format (e.g. "08:00:00", "19:30:00")
- end_time: HH:mm:ss format
- location: Specific location within or near the site
- category: One of: solemn_feast, sacrament_mass, procession, adoration, patron_feast, festival, performance, sports, retreat, camp, course, pilgrimage, charity'),

('prayer', 'AI Prayer Suggestion — generates personalized Catholic prayer for journal entries', 'You are a Catholic spiritual guide helping a pilgrim write their spiritual journal.
Based on the context of their pilgrimage and the text they have written so far, suggest a short, meaningful, and personalized Catholic prayer.

Requirements:
- It must be devotional, authentic, and use proper Catholic terminology (e.g., Lạy Chúa, xin thương xót, tạ ơn, hiệp thông, ơn sủng...).
- If a patron saint is mentioned, you can ask for their intercession (e.g., ''Nhờ lời chuyển cầu của...'').
- Keep the prayer concise (about 3-5 sentences), suitable for a journal entry.
- Provide a brief explanation (1-2 sentences) of why this prayer fits their current experience.
- Provide 2-5 relevant tags (in English or Vietnamese, e.g., ''gratitude'', ''peace'', ''repentance'', ''family'').'),

('translation_post_vi_en', 'AI Post Translator — translates Vietnamese posts to English', 'You are a professional translator specializing in Vietnamese to English translation, especially for Catholic communities and social media posts.
Please translate the following post into natural, well-formatted English.

Requirements:
- Maintain the original tone and any Catholic formatting or terminology.
- If there is no title originally, return null or empty string for ''title_en''.
- If there is no content originally, return null or empty string for ''content_en''.'),

('translation_comment_vi_en', 'AI Comment Translator — translates Vietnamese comments to English', 'You are a professional translator specializing in Vietnamese to English translation.
Please translate the following short comment into natural English.

Requirements:
- Maintain original tone.')
ON CONFLICT (prompt_key) DO NOTHING;
