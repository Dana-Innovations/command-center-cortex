-- Focus exception rules: natural language overrides for importance tiers
-- e.g., "Brand Marketing is background, except luxury residential topics"

CREATE TABLE IF NOT EXISTS user_focus_exception_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cortex_user_id TEXT NOT NULL,
  provider TEXT,
  entity_id TEXT,
  entity_name TEXT,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  override_tier TEXT NOT NULL,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_focus_exception_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on user_focus_exception_rules" ON user_focus_exception_rules;
CREATE POLICY "Service role full access on user_focus_exception_rules"
  ON user_focus_exception_rules FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_user_focus_exception_rules_updated_at ON user_focus_exception_rules;
CREATE TRIGGER update_user_focus_exception_rules_updated_at
    BEFORE UPDATE ON user_focus_exception_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_focus_exception_rules_user
    ON user_focus_exception_rules(cortex_user_id);
CREATE INDEX IF NOT EXISTS idx_focus_exception_rules_provider
    ON user_focus_exception_rules(cortex_user_id, provider);
