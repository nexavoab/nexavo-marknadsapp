-- Nexavo Marknadsapp Database Migration v2
-- WAS-369: chains, local_variants, annual_plans, automation_rules
-- Created: 2026-03-07

-- =============================================================================
-- CHAINS (för kedjeorganisationer med flera franchisetagare)
-- =============================================================================
CREATE TABLE chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    logo_url TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_chains_organization_id ON chains(organization_id);
CREATE INDEX idx_chains_slug ON chains(slug);

CREATE TRIGGER set_chains_updated_at
    BEFORE UPDATE ON chains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- LOCAL_VARIANTS (lokala anpassningar av assets för franchisetagare)
-- =============================================================================
CREATE TYPE generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE local_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    franchisee_id UUID NOT NULL REFERENCES franchisees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    variables_snapshot JSONB NOT NULL DEFAULT '{}',
    generation_status generation_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_local_variants_asset_id ON local_variants(asset_id);
CREATE INDEX idx_local_variants_franchisee_id ON local_variants(franchisee_id);
CREATE INDEX idx_local_variants_organization_id ON local_variants(organization_id);
CREATE INDEX idx_local_variants_generation_status ON local_variants(generation_status);

CREATE TRIGGER set_local_variants_updated_at
    BEFORE UPDATE ON local_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ANNUAL_PLANS (årsplaner för kampanjer)
-- =============================================================================
CREATE TABLE annual_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, brand_id, year)
);

CREATE INDEX idx_annual_plans_organization_id ON annual_plans(organization_id);
CREATE INDEX idx_annual_plans_brand_id ON annual_plans(brand_id);
CREATE INDEX idx_annual_plans_year ON annual_plans(year);

CREATE TRIGGER set_annual_plans_updated_at
    BEFORE UPDATE ON annual_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CAMPAIGN_SLOTS (planerade kampanjplatser i årsplan)
-- =============================================================================
CREATE TYPE slot_status AS ENUM ('planned', 'scheduled', 'active', 'completed', 'cancelled');

CREATE TABLE campaign_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    annual_plan_id UUID NOT NULL REFERENCES annual_plans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slot_start DATE NOT NULL,
    slot_end DATE NOT NULL,
    channels campaign_channel[] NOT NULL DEFAULT '{}',
    budget_sek NUMERIC(12, 2),
    status slot_status NOT NULL DEFAULT 'planned',
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_slots_annual_plan_id ON campaign_slots(annual_plan_id);
CREATE INDEX idx_campaign_slots_organization_id ON campaign_slots(organization_id);
CREATE INDEX idx_campaign_slots_campaign_id ON campaign_slots(campaign_id);
CREATE INDEX idx_campaign_slots_dates ON campaign_slots(slot_start, slot_end);
CREATE INDEX idx_campaign_slots_status ON campaign_slots(status);

CREATE TRIGGER set_campaign_slots_updated_at
    BEFORE UPDATE ON campaign_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- AUTOMATION_RULES (automatiseringsregler för triggers/actions)
-- =============================================================================
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    action TEXT NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_organization_id ON automation_rules(organization_id);
CREATE INDEX idx_automation_rules_is_active ON automation_rules(is_active);
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger);

CREATE TRIGGER set_automation_rules_updated_at
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- WEBHOOK_EVENTS (logg för webhook-händelser)
-- =============================================================================
CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'retrying');

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    automation_rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status webhook_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_organization_id ON webhook_events(organization_id);
CREATE INDEX idx_webhook_events_automation_rule_id ON webhook_events(automation_rule_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_next_retry_at ON webhook_events(next_retry_at);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

CREATE TRIGGER set_webhook_events_updated_at
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ENABLE RLS ON NEW TABLES
-- =============================================================================
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CHAINS POLICIES
-- =============================================================================
CREATE POLICY "Users can view chains in their organization"
    ON chains FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert chains"
    ON chains FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update chains"
    ON chains FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete chains"
    ON chains FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- LOCAL_VARIANTS POLICIES
-- =============================================================================
CREATE POLICY "Users can view local variants in their organization"
    ON local_variants FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Franchisees can view their own local variants"
    ON local_variants FOR SELECT
    USING (
        franchisee_id = (
            SELECT franchisee_id FROM app_users WHERE auth_id = auth.uid()
        )
    );

CREATE POLICY "HQ admins can insert local variants"
    ON local_variants FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update local variants"
    ON local_variants FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete local variants"
    ON local_variants FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- ANNUAL_PLANS POLICIES
-- =============================================================================
CREATE POLICY "Users can view annual plans in their organization"
    ON annual_plans FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert annual plans"
    ON annual_plans FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update annual plans"
    ON annual_plans FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete annual plans"
    ON annual_plans FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- CAMPAIGN_SLOTS POLICIES
-- =============================================================================
CREATE POLICY "Users can view campaign slots in their organization"
    ON campaign_slots FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert campaign slots"
    ON campaign_slots FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update campaign slots"
    ON campaign_slots FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete campaign slots"
    ON campaign_slots FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- AUTOMATION_RULES POLICIES
-- =============================================================================
CREATE POLICY "Users can view automation rules in their organization"
    ON automation_rules FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert automation rules"
    ON automation_rules FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update automation rules"
    ON automation_rules FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete automation rules"
    ON automation_rules FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- WEBHOOK_EVENTS POLICIES
-- =============================================================================
CREATE POLICY "HQ admins can view webhook events in their organization"
    ON webhook_events FOR SELECT
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can insert webhook events"
    ON webhook_events FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update webhook events"
    ON webhook_events FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete webhook events"
    ON webhook_events FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());
