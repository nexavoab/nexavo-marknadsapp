-- Migration: ai_tasks table for OpenClaw integration
-- Date: 2026-03-08

CREATE TABLE IF NOT EXISTS ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  task_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  result JSONB,
  session_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their own tasks
CREATE POLICY "org_members_view_tasks" ON ai_tasks
  FOR SELECT USING (
    org_id IN (
      SELECT organization_id FROM app_users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Service role has full access (for OpenClaw callback)
CREATE POLICY "service_role_all" ON ai_tasks
  FOR ALL USING (auth.role() = 'service_role');

-- Index for faster org lookups
CREATE INDEX IF NOT EXISTS idx_ai_tasks_org_id ON ai_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
