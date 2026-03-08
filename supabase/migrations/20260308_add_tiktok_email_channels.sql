-- Add TikTok and Email as campaign channels
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'email';
ALTER TYPE campaign_channel ADD VALUE IF NOT EXISTS 'print_flyer';
