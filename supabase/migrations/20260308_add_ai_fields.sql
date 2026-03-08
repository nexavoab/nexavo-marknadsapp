-- AI feature toggle and tier system for organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_tier TEXT DEFAULT 'none' CHECK (ai_tier IN ('none', 'basic', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS ai_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_credits_limit INTEGER DEFAULT 0;
