-- WAS-410: Add content_pillar column for campaign content pillars (1-5)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS content_pillar SMALLINT;

-- Add check constraint to ensure values are 1-5
ALTER TABLE campaigns ADD CONSTRAINT campaigns_content_pillar_range 
  CHECK (content_pillar IS NULL OR (content_pillar >= 1 AND content_pillar <= 5));
