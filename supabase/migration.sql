-- ============================================================================
-- Multi-User Auth Migration for Executive Command Center
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- 1. Create allowed_users table (invite list)
-- ============================================================================
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  invited_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Seed with admin (update email as needed)
INSERT INTO allowed_users (email, display_name, role)
VALUES ('aris@sonance.com', 'Aris', 'admin')
ON CONFLICT (email) DO NOTHING;


-- 2. Add user_id column to all data tables
-- ============================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE teams_channels ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE salesforce_opportunities ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE salesforce_reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE action_queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add slack_feed if it exists
DO $$ BEGIN
  ALTER TABLE slack_feed ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- 3. Create indexes on user_id for query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_channels_user_id ON teams_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_salesforce_opportunities_user_id ON salesforce_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_salesforce_reports_user_id ON salesforce_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_action_queue_user_id ON action_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON sync_log(user_id);


-- 4. Update unique constraints to be composite (user_id + external_id)
--    This allows different users to sync the same external records
-- ============================================================================

-- tasks: (user_id, task_gid)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_gid_key;
DO $$ BEGIN
  ALTER TABLE tasks ADD CONSTRAINT tasks_user_task_gid_unique UNIQUE (user_id, task_gid);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- emails: (user_id, message_id)
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_message_id_key;
DO $$ BEGIN
  ALTER TABLE emails ADD CONSTRAINT emails_user_message_id_unique UNIQUE (user_id, message_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- calendar_events: (user_id, event_id)
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_id_key;
DO $$ BEGIN
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_user_event_id_unique UNIQUE (user_id, event_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- chats: (user_id, chat_id)
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_chat_id_key;
DO $$ BEGIN
  ALTER TABLE chats ADD CONSTRAINT chats_user_chat_id_unique UNIQUE (user_id, chat_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- teams_channels: (user_id, channel_id)
ALTER TABLE teams_channels DROP CONSTRAINT IF EXISTS teams_channels_channel_id_key;
DO $$ BEGIN
  ALTER TABLE teams_channels ADD CONSTRAINT teams_channels_user_channel_id_unique UNIQUE (user_id, channel_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- salesforce_opportunities: (user_id, sf_opportunity_id)
ALTER TABLE salesforce_opportunities DROP CONSTRAINT IF EXISTS salesforce_opportunities_sf_opportunity_id_key;
DO $$ BEGIN
  ALTER TABLE salesforce_opportunities ADD CONSTRAINT sf_opportunities_user_opp_id_unique UNIQUE (user_id, sf_opportunity_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- salesforce_reports: (user_id, sf_report_id)
ALTER TABLE salesforce_reports DROP CONSTRAINT IF EXISTS salesforce_reports_sf_report_id_key;
DO $$ BEGIN
  ALTER TABLE salesforce_reports ADD CONSTRAINT sf_reports_user_report_id_unique UNIQUE (user_id, sf_report_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;


-- 5. Enable Row Level Security on all data tables
-- ============================================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;


-- 6. Create RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================

-- tasks
CREATE POLICY "Users see own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- emails
CREATE POLICY "Users see own emails" ON emails FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own emails" ON emails FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own emails" ON emails FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own emails" ON emails FOR DELETE USING (auth.uid() = user_id);

-- calendar_events
CREATE POLICY "Users see own calendar_events" ON calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own calendar_events" ON calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own calendar_events" ON calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own calendar_events" ON calendar_events FOR DELETE USING (auth.uid() = user_id);

-- chats
CREATE POLICY "Users see own chats" ON chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chats" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chats" ON chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own chats" ON chats FOR DELETE USING (auth.uid() = user_id);

-- teams_channels
CREATE POLICY "Users see own teams_channels" ON teams_channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own teams_channels" ON teams_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own teams_channels" ON teams_channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own teams_channels" ON teams_channels FOR DELETE USING (auth.uid() = user_id);

-- salesforce_opportunities
CREATE POLICY "Users see own sf_opportunities" ON salesforce_opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sf_opportunities" ON salesforce_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sf_opportunities" ON salesforce_opportunities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sf_opportunities" ON salesforce_opportunities FOR DELETE USING (auth.uid() = user_id);

-- salesforce_reports
CREATE POLICY "Users see own sf_reports" ON salesforce_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sf_reports" ON salesforce_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sf_reports" ON salesforce_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sf_reports" ON salesforce_reports FOR DELETE USING (auth.uid() = user_id);

-- action_queue
CREATE POLICY "Users see own action_queue" ON action_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own action_queue" ON action_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own action_queue" ON action_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own action_queue" ON action_queue FOR DELETE USING (auth.uid() = user_id);

-- sync_log
CREATE POLICY "Users see own sync_log" ON sync_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sync_log" ON sync_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sync_log" ON sync_log FOR UPDATE USING (auth.uid() = user_id);


-- 7. Truncate existing data (has no user_id, would be orphaned)
-- ============================================================================
TRUNCATE tasks, emails, calendar_events, chats, teams_channels,
  salesforce_opportunities, salesforce_reports,
  action_queue, sync_log;
