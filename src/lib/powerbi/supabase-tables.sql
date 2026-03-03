-- Power BI KPIs table
-- Run this in the Supabase SQL editor to create the required tables

CREATE TABLE IF NOT EXISTS powerbi_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name TEXT NOT NULL,
  kpi_category TEXT NOT NULL,
  current_value NUMERIC,
  previous_value NUMERIC,
  target_value NUMERIC,
  unit TEXT NOT NULL DEFAULT '#',
  period TEXT NOT NULL DEFAULT 'MTD',
  dataset_id TEXT NOT NULL,
  dax_query TEXT,
  raw_result JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(kpi_name, period)
);

-- Power BI Report Configs table
CREATE TABLE IF NOT EXISTS powerbi_report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE,
  report_name TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  embed_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE powerbi_kpis;
ALTER PUBLICATION supabase_realtime ADD TABLE powerbi_report_configs;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_powerbi_kpis_category ON powerbi_kpis(kpi_category);
CREATE INDEX IF NOT EXISTS idx_powerbi_kpis_period ON powerbi_kpis(period);
CREATE INDEX IF NOT EXISTS idx_powerbi_report_configs_active ON powerbi_report_configs(is_active) WHERE is_active = true;
