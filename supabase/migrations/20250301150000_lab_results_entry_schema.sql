-- Lab Results Entry & Validation - Extended schema
-- Supports versioned results, attachments, threshold configs, CSV import jobs

-- Extend lab_results with new columns for SPC/Total Coliform entry
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS spc_unit TEXT;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS total_coliform_unit TEXT;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS entered_at TIMESTAMPTZ;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS flags TEXT[] DEFAULT '{}';

-- Extend status check for lab results
ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_status_check;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_status_check CHECK (
  status IN ('pending', 'approved', 'rejected', 'draft', 'validated', 'flagged')
);

-- Result versions (audit trail for edits)
CREATE TABLE IF NOT EXISTS public.result_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data_snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_result_versions_result_id ON public.result_versions(result_id);

-- Result attachments (instrument output files, PDFs, images)
CREATE TABLE IF NOT EXISTS public.result_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_result_attachments_result_id ON public.result_attachments(result_id);

-- Threshold configs per customer/site
CREATE TABLE IF NOT EXISTS public.threshold_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  spc_min DOUBLE PRECISION,
  spc_max DOUBLE PRECISION,
  spc_unit TEXT NOT NULL DEFAULT 'CFU/mL',
  tc_min DOUBLE PRECISION,
  tc_max DOUBLE PRECISION,
  tc_unit TEXT NOT NULL DEFAULT 'CFU/100mL',
  allowed_methods TEXT[] DEFAULT '{}',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threshold_configs_customer_site ON public.threshold_configs(customer_id, site_id);

CREATE TRIGGER threshold_configs_updated_at
  BEFORE UPDATE ON public.threshold_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Lab audit log for traceability
CREATE TABLE IF NOT EXISTS public.lab_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sample_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
  result_id UUID REFERENCES public.lab_results(id) ON DELETE SET NULL,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_audit_log_result_id ON public.lab_audit_log(result_id);
CREATE INDEX IF NOT EXISTS idx_lab_audit_log_sample_id ON public.lab_audit_log(sample_id);

-- CSV import jobs for batch import
CREATE TABLE IF NOT EXISTS public.csv_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Storage bucket for lab attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-attachments',
  'lab-attachments',
  false,
  52428800,
  ARRAY['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lab attachments: authenticated upload" ON storage.objects;
CREATE POLICY "Lab attachments: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lab-attachments');

DROP POLICY IF EXISTS "Lab attachments: authenticated read" ON storage.objects;
CREATE POLICY "Lab attachments: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lab-attachments');

-- RLS for new tables
ALTER TABLE public.result_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab users can read result_versions"
  ON public.result_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab users can insert result_versions"
  ON public.result_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Lab users can read result_attachments"
  ON public.result_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab users can insert result_attachments"
  ON public.result_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can read threshold_configs"
  ON public.threshold_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage threshold_configs"
  ON public.threshold_configs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'LAB_MANAGER')
    )
  );

CREATE POLICY "Lab users can read lab_audit_log"
  ON public.lab_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab users can insert lab_audit_log"
  ON public.lab_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Lab users can read csv_import_jobs"
  ON public.csv_import_jobs FOR SELECT TO authenticated USING (auth.uid() = uploaded_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
  ));
CREATE POLICY "Lab users can insert csv_import_jobs"
  ON public.csv_import_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Lab users can update csv_import_jobs"
  ON public.csv_import_jobs FOR UPDATE TO authenticated USING (true);
