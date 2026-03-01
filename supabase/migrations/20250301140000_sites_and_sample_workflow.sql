-- Sample Management Workflow: Sites table and extended pickups schema
-- Supports siteId, vialCount, pickupLocationName, sampleId, workflow states

-- Sites table (for sample pickup site references)
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for sites
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sites"
  ON public.sites FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Lab managers and admins can manage sites"
  ON public.sites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

-- Extend pickups for Sample Management Workflow
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS vial_count INTEGER DEFAULT 1;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS pickup_location_name TEXT;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS sample_id TEXT;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS chlorine_reading DOUBLE PRECISION;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Index for sample lookups
CREATE INDEX IF NOT EXISTS idx_pickups_site_id ON public.pickups(site_id);
CREATE INDEX IF NOT EXISTS idx_pickups_sample_id ON public.pickups(sample_id);

-- Extend status check for workflow states
ALTER TABLE public.pickups DROP CONSTRAINT IF EXISTS pickups_status_check;
ALTER TABLE public.pickups ADD CONSTRAINT pickups_status_check CHECK (
  status IN (
    'scheduled', 'in_progress', 'completed',
    'draft', 'pending_pickup', 'pending', 'submitted', 'synced', 'rejected',
    'in_lab', 'lab_approved', 'archived'
  )
);

-- Audit log with from_state and to_state for workflow transitions
CREATE TABLE IF NOT EXISTS public.sample_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID REFERENCES public.pickups(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sample_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit log for their samples"
  ON public.sample_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert audit entries"
  ON public.sample_audit_log FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

-- Seed default sites for development (only if empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sites LIMIT 1) THEN
    INSERT INTO public.sites (name, address, customer_id, lat, lon, metadata)
    VALUES
      ('Site 1 - Main Building', '123 Water St', NULL, 37.7749, -122.4194, '{}'),
      ('Site 2 - North Wing', '456 Sample Ave', NULL, 37.7750, -122.4195, '{}'),
      ('Site 3 - East Facility', '789 Test Blvd', NULL, 37.7751, -122.4196, '{}');
  END IF;
END $$;
