-- Migration: ai_tasks table for AI logging + OpenClaw integration
-- Created: 2026-03-08
-- Issues: WAS-399, WAS-400

CREATE TABLE IF NOT EXISTS ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  task_type TEXT NOT NULL, -- 'generate-concept', 'generate-campaign-pack', 'generate-image', 'check-brand-guardrails'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  session_key TEXT,         -- OpenClaw session som triggar task
  completed_at TIMESTAMPTZ, -- satt när status = 'completed' eller 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ai_tasks_org_id_idx ON ai_tasks(org_id);
CREATE INDEX IF NOT EXISTS ai_tasks_status_idx ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS ai_tasks_created_at_idx ON ai_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_tasks_task_type_idx ON ai_tasks(task_type);

-- RLS
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

-- Org members kan se sina egna tasks (SELECT)
CREATE POLICY "org_members_view_tasks" ON ai_tasks
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid())
  );

-- Service role (OpenClaw callback) har full access
CREATE POLICY "service_role_all" ON ai_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_ai_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('completed', 'failed') AND OLD.completed_at IS NULL THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_tasks_updated_at_trigger
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_tasks_updated_at();

COMMENT ON TABLE ai_tasks IS 'Logs all AI-powered tasks for analytics, debugging, and OpenClaw callbacks';
