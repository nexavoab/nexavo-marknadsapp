-- WAS-377: Notifications table for franchisee notifications
-- Run via Supabase Dashboard > SQL Editor

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    franchisee_id UUID REFERENCES franchisees(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    channel TEXT DEFAULT 'in_app', -- in_app, email, sms
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS notifications_organization_idx ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS notifications_franchisee_idx ON notifications(franchisee_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(franchisee_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: HQ users can see all notifications for their organization
CREATE POLICY "hq_view_org_notifications" ON notifications
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM app_users WHERE id = auth.uid() AND role = 'hq'
        )
    );

-- Policy: HQ users can create notifications for their organization
CREATE POLICY "hq_create_notifications" ON notifications
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM app_users WHERE id = auth.uid() AND role = 'hq'
        )
    );

-- Policy: Franchisees can see their own notifications
CREATE POLICY "franchisees_own_notifications" ON notifications
    FOR SELECT USING (
        franchisee_id IN (
            SELECT id FROM franchisees WHERE organization_id = (
                SELECT organization_id FROM app_users WHERE id = auth.uid()
            )
        )
    );

-- Policy: Users can mark their own notifications as read
CREATE POLICY "users_update_own_notifications" ON notifications
    FOR UPDATE USING (
        franchisee_id IN (
            SELECT id FROM franchisees WHERE organization_id = (
                SELECT organization_id FROM app_users WHERE id = auth.uid()
            )
        )
        OR
        organization_id IN (
            SELECT organization_id FROM app_users WHERE id = auth.uid() AND role = 'hq'
        )
    );
