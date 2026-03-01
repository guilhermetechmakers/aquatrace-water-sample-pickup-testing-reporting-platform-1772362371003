-- Data Export & Import - Jobs, Audit Log, Storage
-- Supports bulk export (samples, results, invoices), CSV import, audit trails

-- Data export jobs (background export tracking)
CREATE TABLE IF NOT EXISTS public.data_export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('samples', 'results', 'invoices', 'all')),
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json')),
  scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'per_customer', 'per_site')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}',
  download_token TEXT,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_jobs_requested_by ON public.data_export_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON public.data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_created_at ON public.data_export_jobs(created_at DESC);

-- Data import jobs (CSV import with preview/commit)
CREATE TABLE IF NOT EXISTS public.data_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('samples', 'results', 'invoices', 'customers')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]',
  raw_csv_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_import_jobs_uploaded_by ON public.data_import_jobs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_data_import_jobs_status ON public.data_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_import_jobs_created_at ON public.data_import_jobs(created_at DESC);

-- Data audit log (immutable export/import audit trail)
CREATE TABLE IF NOT EXISTS public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('import', 'export', 'export_access', 'export_download')),
  data_type TEXT NOT NULL,
  record_ids TEXT[],
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_audit_log_user_id ON public.data_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_action ON public.data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_data_type ON public.data_audit_log(data_type);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_created_at ON public.data_audit_log(created_at DESC);

-- Storage bucket for data exports (private, time-limited access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'data-exports',
  'data-exports',
  false,
  104857600,
  ARRAY['text/csv', 'application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS for data_export_jobs
ALTER TABLE public.data_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage data_export_jobs"
  ON public.data_export_jobs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'LAB_MANAGER')
    )
  );

CREATE POLICY "Users can read own export jobs"
  ON public.data_export_jobs FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- RLS for data_import_jobs
ALTER TABLE public.data_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage data_import_jobs"
  ON public.data_import_jobs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'LAB_MANAGER')
    )
  );

CREATE POLICY "Users can read own import jobs"
  ON public.data_import_jobs FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());

-- RLS for data_audit_log
ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read data_audit_log"
  ON public.data_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "System can insert data_audit_log"
  ON public.data_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Storage policies for data-exports bucket
DROP POLICY IF EXISTS "Admins can upload data exports" ON storage.objects;
CREATE POLICY "Admins can upload data exports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'data-exports' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'LAB_MANAGER')
    )
  );

DROP POLICY IF EXISTS "Users can read own export files" ON storage.objects;
CREATE POLICY "Users can read own export files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'data-exports');
