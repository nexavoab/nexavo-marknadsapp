-- Migration: Add ai_tasks table for AI task logging
-- Created: 2026-03-08
-- Issue: WAS-400

CREATE TABLE IF NOT EXISTS ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  task_type TEXT NOT NULL, -- 'generate-concept', 'generate-campaign-pack', 'generate-image', 'check-brand-guardrails'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX ai_tasks_org_id_idx ON ai_tasks(org_id);
CREATE INDEX ai_tasks_status_idx ON ai_tasks(status);
CREATE INDEX ai_tasks_created_at_idx ON ai_tasks(created_at DESC);
CREATE INDEX ai_tasks_task_type_idx ON ai_tasks(task_type);

-- Enable RLS
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can access ai_tasks for organizations they belong to
CREATE POLICY "ai_tasks_org_access" ON ai_tasks FOR ALL USING (
  org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid())
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_tasks_updated_at_trigger
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_tasks_updated_at();

-- Comment on table
COMMENT ON TABLE ai_tasks IS 'Logs all AI-powered tasks (concept generation, image generation, etc.) for analytics and debugging';
