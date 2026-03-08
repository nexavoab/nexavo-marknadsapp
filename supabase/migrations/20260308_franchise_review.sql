-- WAS-391: Franchise godkännandeflöde — spara rejection_comment + local_customization
-- Created: 2026-03-08

-- Lägg till rejection_comment på campaigns (sparas när franchisee avvisar)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
  ADD COLUMN IF NOT EXISTS local_customization JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN campaigns.rejection_comment IS 'Franchisees kommentar vid avvisning';
COMMENT ON COLUMN campaigns.local_customization IS 'Franchisees lokala anpassning: {phone, city, contactName}';
