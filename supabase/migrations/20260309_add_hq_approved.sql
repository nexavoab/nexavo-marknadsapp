-- WAS-411: Add hq_approved column for internal HQ signoff
-- This column determines if a campaign is visible to franchise users

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS hq_approved BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.hq_approved IS 'Internal HQ signoff - franchise users only see campaigns where hq_approved = true';

-- Create index for performance when filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_hq_approved ON campaigns(hq_approved) WHERE hq_approved = true;
