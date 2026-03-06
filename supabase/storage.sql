-- ============================================================
-- Supabase Storage Buckets & Policies
-- Sprint 3: AI Pipeline Asset Storage
-- ============================================================

-- Skapa storage buckets för varumärkes- och kampanjmaterial
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'brand-assets',
    'brand-assets',
    true,
    52428800, -- 50 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
  ),
  (
    'campaign-assets',
    'campaign-assets',
    true,
    52428800, -- 50 MB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- Brand Assets Policies
-- ============================================================

-- Alla autentiserade användare kan läsa brand assets (public bucket)
DROP POLICY IF EXISTS "Brand assets readable by authenticated" ON storage.objects;
CREATE POLICY "Brand assets readable by authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'brand-assets');

-- Alla (även anonyma) kan läsa brand assets (för public URLs)
DROP POLICY IF EXISTS "Brand assets publicly readable" ON storage.objects;
CREATE POLICY "Brand assets publicly readable"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'brand-assets');

-- HQ admins kan ladda upp brand assets
-- Path måste börja med organization_id
DROP POLICY IF EXISTS "HQ can upload brand assets" ON storage.objects;
CREATE POLICY "HQ can upload brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- HQ admins kan uppdatera sina brand assets
DROP POLICY IF EXISTS "HQ can update brand assets" ON storage.objects;
CREATE POLICY "HQ can update brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- HQ admins kan ta bort sina brand assets
DROP POLICY IF EXISTS "HQ can delete brand assets" ON storage.objects;
CREATE POLICY "HQ can delete brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- ============================================================
-- Campaign Assets Policies
-- ============================================================

-- Autentiserade användare kan läsa campaign assets från sin org
DROP POLICY IF EXISTS "Campaign assets readable by org" ON storage.objects;
CREATE POLICY "Campaign assets readable by org"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- Public read för campaign assets (för att visa i app)
DROP POLICY IF EXISTS "Campaign assets publicly readable" ON storage.objects;
CREATE POLICY "Campaign assets publicly readable"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'campaign-assets');

-- HQ admins kan ladda upp campaign assets
DROP POLICY IF EXISTS "HQ can upload campaign assets" ON storage.objects;
CREATE POLICY "HQ can upload campaign assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- HQ admins kan uppdatera campaign assets
DROP POLICY IF EXISTS "HQ can update campaign assets" ON storage.objects;
CREATE POLICY "HQ can update campaign assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- HQ admins kan ta bort campaign assets
DROP POLICY IF EXISTS "HQ can delete campaign assets" ON storage.objects;
CREATE POLICY "HQ can delete campaign assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_id = auth.uid()
    AND role = 'hq_admin'
    AND (storage.foldername(name))[1] = organization_id::text
  )
);

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON POLICY "Brand assets publicly readable" ON storage.objects IS 
  'Tillåter public access till brand assets för att visa logotyper etc. utan auth';

COMMENT ON POLICY "Campaign assets publicly readable" ON storage.objects IS 
  'Tillåter public access till campaign assets för att visa genererade annonser';
