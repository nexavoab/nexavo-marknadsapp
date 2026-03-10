-- WAS-lager3b: Create scheduled_posts table for calendar integration
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT,
  channel TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'scheduled', 'published')),
  headline TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient org + date range queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_org_date 
  ON scheduled_posts(org_id, scheduled_date);

-- Seed data for testing
INSERT INTO scheduled_posts (org_id, campaign_name, channel, scheduled_date, status, headline)
SELECT 
  id as org_id,
  'Sommarkampanj' as campaign_name,
  'instagram' as channel,
  '2026-03-15'::date as scheduled_date,
  'scheduled' as status,
  'Semestern börjar här 🌞' as headline
FROM organizations LIMIT 1
ON CONFLICT DO NOTHING;
