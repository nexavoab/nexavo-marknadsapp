-- WAS-377: Seed data for notifications
-- Run after 20260307120100_notifications.sql

-- Insert test notifications (assumes organization_id exists)
-- Replace with actual org ID from your database

DO $$
DECLARE
    org_id UUID;
    franchisee_id_var UUID;
BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;
    
    -- Get the first franchisee if exists
    SELECT id INTO franchisee_id_var FROM franchisees LIMIT 1;
    
    IF org_id IS NOT NULL THEN
        -- Notification 1: Campaign ready for approval
        INSERT INTO notifications (organization_id, franchisee_id, type, title, message, payload, channel)
        VALUES (
            org_id,
            franchisee_id_var,
            'campaign_ready_for_approval',
            'Vår-kampanjen är redo att godkännas',
            'Kampanjen "Vår-kampanjen 2026" är redo för granskning. 5 dagar kvar till start.',
            '{"campaignTitle": "Vår-kampanjen 2026", "daysUntilStart": 5}'::jsonb,
            'in_app'
        );
        
        -- Notification 2: Reminder
        INSERT INTO notifications (organization_id, franchisee_id, type, title, message, payload, channel)
        VALUES (
            org_id,
            franchisee_id_var,
            'campaign_reminder',
            'Påminnelse: Godkänn Sommar-kampanjen',
            'Glöm inte att granska och godkänna "Sommar-kampanjen 2026". 3 dagar kvar.',
            '{"campaignTitle": "Sommar-kampanjen 2026", "daysUntilStart": 3}'::jsonb,
            'in_app'
        );
        
        -- Notification 3: Campaign live
        INSERT INTO notifications (organization_id, franchisee_id, type, title, message, payload, read_at, channel)
        VALUES (
            org_id,
            franchisee_id_var,
            'campaign_live',
            '🎉 Grattis! Din kampanj är nu live',
            'Kampanjen "Påsk-kampanjen 2026" är nu publicerad och aktiv.',
            '{"campaignTitle": "Påsk-kampanjen 2026"}'::jsonb,
            NOW() - INTERVAL '1 day',  -- Already read
            'in_app'
        );
        
        RAISE NOTICE 'Inserted 3 seed notifications for organization %', org_id;
    ELSE
        RAISE WARNING 'No organization found - skipping notification seed';
    END IF;
END $$;
