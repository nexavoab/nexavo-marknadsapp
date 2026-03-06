-- Nexavo Marknadsapp Database Schema
-- Sprint 1: Fundament

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TRIGGER FUNCTION FOR updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- BRANDS
-- =============================================================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tone_traits JSONB NOT NULL DEFAULT '{"formality": 0.5, "modernity": 0.5, "emotion": 0.5, "volume": 0.5}',
    colors JSONB NOT NULL DEFAULT '{"primary": "#000000"}',
    logos JSONB NOT NULL DEFAULT '{"primary_url": "", "min_size_px": 48, "safe_zone_percent": 10}',
    typography JSONB NOT NULL DEFAULT '{"heading_font": "Inter", "body_font": "Inter"}',
    imagery JSONB NOT NULL DEFAULT '{"forbidden_styles": [], "example_urls": []}',
    forbidden_words TEXT[] NOT NULL DEFAULT '{}',
    required_disclaimers TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_organization_id ON brands(organization_id);

CREATE TRIGGER set_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CAMPAIGNS
-- =============================================================================
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'archived');
CREATE TYPE campaign_channel AS ENUM ('facebook', 'instagram', 'google', 'print', 'display');

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status campaign_status NOT NULL DEFAULT 'draft',
    channels campaign_channel[] NOT NULL DEFAULT '{}',
    start_date DATE,
    end_date DATE,
    target_persona JSONB,
    key_messages TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TEMPLATES
-- =============================================================================
CREATE TYPE template_format AS ENUM (
    'facebook_feed', 'facebook_story',
    'instagram_feed', 'instagram_story',
    'google_display', 'google_search',
    'print_a4', 'print_a5', 'print_a3',
    'email_header'
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format template_format NOT NULL,
    layout JSONB NOT NULL DEFAULT '{}',
    preview_url TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_organization_id ON templates(organization_id);
CREATE INDEX idx_templates_brand_id ON templates(brand_id);
CREATE INDEX idx_templates_format ON templates(format);

CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ASSETS
-- =============================================================================
CREATE TYPE asset_type AS ENUM ('image', 'composite', 'copy', 'pdf');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type asset_type NOT NULL,
    format template_format,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    thumbnail_url TEXT,
    dimensions JSONB,
    file_size_bytes BIGINT,
    mime_type TEXT,
    copy_text TEXT,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_organization_id ON assets(organization_id);
CREATE INDEX idx_assets_campaign_id ON assets(campaign_id);
CREATE INDEX idx_assets_template_id ON assets(template_id);
CREATE INDEX idx_assets_type ON assets(type);

CREATE TRIGGER set_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FRANCHISEES
-- =============================================================================
CREATE TABLE franchisees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    region TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_franchisees_organization_id ON franchisees(organization_id);
CREATE INDEX idx_franchisees_is_active ON franchisees(is_active);

CREATE TRIGGER set_franchisees_updated_at
    BEFORE UPDATE ON franchisees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- APP_USERS (to avoid conflict with auth.users)
-- =============================================================================
CREATE TYPE user_role AS ENUM ('hq_admin', 'franchisee');

CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    franchisee_id UUID REFERENCES franchisees(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'franchisee',
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_auth_id ON app_users(auth_id);
CREATE INDEX idx_app_users_organization_id ON app_users(organization_id);
CREATE INDEX idx_app_users_franchisee_id ON app_users(franchisee_id);
CREATE INDEX idx_app_users_role ON app_users(role);

CREATE TRIGGER set_app_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchisees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM app_users WHERE auth_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is HQ admin
CREATE OR REPLACE FUNCTION is_hq_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM app_users 
        WHERE auth_id = auth.uid() AND role = 'hq_admin'
    )
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = get_user_organization_id());

CREATE POLICY "HQ admins can update their organization"
    ON organizations FOR UPDATE
    USING (id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- BRANDS POLICIES
-- =============================================================================
CREATE POLICY "Users can view brands in their organization"
    ON brands FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert brands"
    ON brands FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update brands"
    ON brands FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete brands"
    ON brands FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- CAMPAIGNS POLICIES
-- =============================================================================
CREATE POLICY "Users can view campaigns in their organization"
    ON campaigns FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update campaigns"
    ON campaigns FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete campaigns"
    ON campaigns FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- TEMPLATES POLICIES
-- =============================================================================
CREATE POLICY "Users can view templates in their organization"
    ON templates FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert templates"
    ON templates FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update templates"
    ON templates FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete templates"
    ON templates FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- ASSETS POLICIES
-- =============================================================================
CREATE POLICY "Users can view assets in their organization"
    ON assets FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert assets"
    ON assets FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update assets"
    ON assets FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete assets"
    ON assets FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- FRANCHISEES POLICIES
-- =============================================================================
CREATE POLICY "Users can view franchisees in their organization"
    ON franchisees FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "HQ admins can insert franchisees"
    ON franchisees FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update franchisees"
    ON franchisees FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can delete franchisees"
    ON franchisees FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

-- =============================================================================
-- APP_USERS POLICIES
-- =============================================================================
CREATE POLICY "Users can view their own user record"
    ON app_users FOR SELECT
    USING (auth_id = auth.uid());

CREATE POLICY "HQ admins can view all users in their organization"
    ON app_users FOR SELECT
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can insert users in their organization"
    ON app_users FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "HQ admins can update users in their organization"
    ON app_users FOR UPDATE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());

CREATE POLICY "Users can update their own profile"
    ON app_users FOR UPDATE
    USING (auth_id = auth.uid())
    WITH CHECK (
        auth_id = auth.uid() 
        AND organization_id = get_user_organization_id()
        -- Users can't change their own role
    );

CREATE POLICY "HQ admins can delete users in their organization"
    ON app_users FOR DELETE
    USING (organization_id = get_user_organization_id() AND is_hq_admin());
