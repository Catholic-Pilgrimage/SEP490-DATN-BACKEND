-- ============================================
-- MIGRATION: Add Reviews & Ratings tables
-- Run this on existing databases to add review support
-- ============================================

-- 1. Site Reviews
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_site_reviews_user_site
ON site_reviews(user_id, site_id) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_site_reviews_updated_at ON site_reviews;
CREATE TRIGGER update_site_reviews_updated_at
    BEFORE UPDATE ON site_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Nearby Place Reviews
CREATE TABLE IF NOT EXISTS nearby_place_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nearby_place_id UUID NOT NULL REFERENCES nearby_places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nearby_place_reviews_place ON nearby_place_reviews(nearby_place_id);
CREATE INDEX IF NOT EXISTS idx_nearby_place_reviews_user ON nearby_place_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_nearby_place_reviews_rating ON nearby_place_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_nearby_place_reviews_active ON nearby_place_reviews(is_active) WHERE is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nearby_place_reviews_user_place
ON nearby_place_reviews(user_id, nearby_place_id) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_nearby_place_reviews_updated_at ON nearby_place_reviews;
CREATE TRIGGER update_nearby_place_reviews_updated_at
    BEFORE UPDATE ON nearby_place_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Site Review Replies (1 reply per review)
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

DROP TRIGGER IF EXISTS update_site_review_replies_updated_at ON site_review_replies;
CREATE TRIGGER update_site_review_replies_updated_at
    BEFORE UPDATE ON site_review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Nearby Place Review Replies (1 reply per review)
CREATE TABLE IF NOT EXISTS nearby_place_review_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL UNIQUE REFERENCES nearby_place_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nearby_place_review_replies_review ON nearby_place_review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_nearby_place_review_replies_user ON nearby_place_review_replies(user_id);

DROP TRIGGER IF EXISTS update_nearby_place_review_replies_updated_at ON nearby_place_review_replies;
CREATE TRIGGER update_nearby_place_review_replies_updated_at
    BEFORE UPDATE ON nearby_place_review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
