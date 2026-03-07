-- Idempotency för webhook_events
ALTER TABLE webhook_events 
  ADD COLUMN IF NOT EXISTS external_event_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_idempotency 
  ON webhook_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- Retry-kolumner
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS webhook_events_retry_idx 
  ON webhook_events(next_retry_at) 
  WHERE status IN ('failed', 'retrying');
