-- ============================================
-- PEOPLE RELEVANCE SCORING
-- Interaction history snapshots + computed relevance scores
-- ============================================

-- Daily interaction snapshots per person, accumulated over time
CREATE TABLE IF NOT EXISTS people_interaction_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cortex_user_id TEXT NOT NULL,
    person_key TEXT NOT NULL,
    person_name TEXT NOT NULL,
    person_email TEXT,
    snapshot_date DATE NOT NULL,
    email_received INTEGER NOT NULL DEFAULT 0,
    email_sent INTEGER NOT NULL DEFAULT 0,
    teams_messages INTEGER NOT NULL DEFAULT 0,
    meetings INTEGER NOT NULL DEFAULT 0,
    slack_messages INTEGER NOT NULL DEFAULT 0,
    asana_tasks INTEGER NOT NULL DEFAULT 0,
    total_interactions INTEGER NOT NULL DEFAULT 0,
    channel_count INTEGER NOT NULL DEFAULT 0,
    last_interaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cortex_user_id, person_key, snapshot_date)
);

ALTER TABLE people_interaction_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on people_interaction_snapshots" ON people_interaction_snapshots;
CREATE POLICY "Service role full access on people_interaction_snapshots" ON people_interaction_snapshots
    FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_people_interaction_snapshots_updated_at ON people_interaction_snapshots;
CREATE TRIGGER update_people_interaction_snapshots_updated_at
    BEFORE UPDATE ON people_interaction_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_people_snapshots_user_person_date
    ON people_interaction_snapshots(cortex_user_id, person_key, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_people_snapshots_user_date
    ON people_interaction_snapshots(cortex_user_id, snapshot_date DESC);

-- Materialized relevance scores, recomputed after each snapshot run
CREATE TABLE IF NOT EXISTS people_relevance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cortex_user_id TEXT NOT NULL,
    person_key TEXT NOT NULL,
    person_name TEXT NOT NULL,
    person_email TEXT,
    recency_score NUMERIC NOT NULL DEFAULT 0,
    frequency_score NUMERIC NOT NULL DEFAULT 0,
    diversity_score NUMERIC NOT NULL DEFAULT 0,
    bidirectionality_score NUMERIC NOT NULL DEFAULT 0,
    trend_score NUMERIC NOT NULL DEFAULT 0,
    relevance_score NUMERIC NOT NULL DEFAULT 0,
    total_interactions_30d INTEGER NOT NULL DEFAULT 0,
    active_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    last_interaction_at TIMESTAMPTZ,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cortex_user_id, person_key)
);

ALTER TABLE people_relevance_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on people_relevance_scores" ON people_relevance_scores;
CREATE POLICY "Service role full access on people_relevance_scores" ON people_relevance_scores
    FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_people_relevance_scores_updated_at ON people_relevance_scores;
CREATE TRIGGER update_people_relevance_scores_updated_at
    BEFORE UPDATE ON people_relevance_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_people_relevance_user_score
    ON people_relevance_scores(cortex_user_id, relevance_score DESC);
