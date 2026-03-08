-- WAS-403: Social OAuth connections with Supabase Vault integration
-- Created: 2026-03-08

CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('meta', 'google', 'linkedin', 'tiktok')),
  provider_account_id TEXT,
  provider_account_name TEXT,
  vault_secret_id TEXT, -- ID till Supabase Vault-hemlighet
  scopes TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, provider)
);

-- Indexes
CREATE INDEX idx_social_connections_org_id ON social_connections(org_id);
CREATE INDEX idx_social_connections_provider ON social_connections(provider);
CREATE INDEX idx_social_connections_status ON social_connections(status);

-- Trigger for updated_at
CREATE TRIGGER set_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organization members can view/manage their org's connections
CREATE POLICY "org_members_access" ON social_connections
  FOR ALL USING (
    org_id IN (SELECT organization_id FROM app_users WHERE auth_id = auth.uid())
  );

-- Service role has full access (for Edge Functions)
CREATE POLICY "service_role_all" ON social_connections
  FOR ALL USING (auth.role() = 'service_role');

-- OAuth states table for CSRF protection (if not exists)
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_oauth_states" ON oauth_states
  FOR ALL USING (auth.role() = 'service_role');
