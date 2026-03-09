-- WAS-391: Franchise godkännandeflöde — spara rejection_comment + local_customization
-- Created: 2026-03-08

-- Utöka campaign_status enum med godkännandevärden
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Utöka campaign_channel enum (synkar med frontend-typer)
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'linkedin';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'print_flyer';

-- Lägg till rejection_comment på campaigns (sparas när franchisee avvisar)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS local_customization JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN campaigns.rejection_comment IS 'Franchisees kommentar vid avvisning';
COMMENT ON COLUMN campaigns.local_customization IS 'Franchisees lokala anpassning: {phone, city, contactName}';
