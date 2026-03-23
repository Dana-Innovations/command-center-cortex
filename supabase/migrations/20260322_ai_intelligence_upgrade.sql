-- ============================================
-- AI INTELLIGENCE UPGRADE
-- Add attendees to calendar, direction/to fields to emails,
-- and indexes for relationship dossier queries
-- ============================================

-- 1. Calendar attendees
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS attendees TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Email direction and recipient fields (sent emails tracking)
ALTER TABLE emails
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS to_name TEXT,
  ADD COLUMN IF NOT EXISTS to_email TEXT,
  ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- 3. Indexes for relationship dossier queries
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(user_id, from_email);
CREATE INDEX IF NOT EXISTS idx_emails_to_email ON emails(user_id, to_email);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(user_id, direction);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_email ON tasks(user_id, assignee_email)
  WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_email ON tasks(user_id, created_by_email)
  WHERE completed = false;
