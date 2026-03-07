-- ============================================
-- BOOKINGS TARGETS
-- User-set quarterly revenue targets per vertical
-- ============================================

CREATE TABLE IF NOT EXISTS bookings_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    quarter TEXT NOT NULL,
    segment TEXT NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    color TEXT DEFAULT 'bg-accent-teal',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quarter, segment)
);

ALTER TABLE bookings_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on bookings_targets" ON bookings_targets
    FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_bookings_targets_updated_at ON bookings_targets;
CREATE TRIGGER update_bookings_targets_updated_at
    BEFORE UPDATE ON bookings_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bookings_targets_user_quarter ON bookings_targets(user_id, quarter);
