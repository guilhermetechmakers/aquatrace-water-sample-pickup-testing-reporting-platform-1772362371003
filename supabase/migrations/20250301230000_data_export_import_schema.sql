-- Data Export & Import Schema for AquaTrace
-- Export jobs, import jobs, audit logs for compliance and accounting

-- Export jobs (bulk export with background processing)
CREATE TABLE IF NOT EXISTS public.data_export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('samples', 'results', 'invoices', 'all')),
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format IN ('csv', 'json')),
  scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'per_customer', 'per_site')),
  filters JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  download_token TEXT UNIQUE,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_jobs_requested_by ON public.data_export_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_status ON public.data_export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_created_at ON public.data_export_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_jobs_download_token ON public.data_export_jobs(download_token);

-- Data import jobs (CSV import with validation)
CREATE TABLE IF NOT EXISTS public.data_import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('samples', 'results', 'invoices', 'customers')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'preview', 'processing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  validation_errors JSONB DEFAULT '[]',
  preview_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_import_jobs_uploaded_by ON public.data_import_jobs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_data_import_jobs_status ON public.data_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_data_import_jobs_created_at ON public.data_import_jobs(created_at DESC);

-- Data audit log (immutable audit trail for export/import)
CREATE TABLE IF NOT EXISTS public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('import', 'export', 'export_access', 'import_commit')),
  data_type TEXT,
  record_ids TEXT[],
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_audit_log_user_id ON public.data_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_action ON public.data_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_data_audit_log_created_at ON public.data_audit_log(created_at DESC);

-- Storage bucket for export artifacts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'data-exports',
  'data-exports',
  false,
  52428800,
  ARRAY['text/csv', 'application/json']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for data-exports (service role writes; authenticated read with token check via signed URL)
DROP POLICY IF EXISTS "data-exports: service can write" ON storage.objects;
CREATE POLICY "data-exports: service can write"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'data-exports');

DROP POLICY IF EXISTS "data-exports: authenticated read own" ON storage.objects;
CREATE POLICY "data-exports: authenticated read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'data-exports');

-- RLS for data_export_jobs
ALTER TABLE public.data_export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own export jobs"
  ON public.data_export_jobs FOR SELECT TO authenticated
  USING (auth.uid() = requested_by);

CREATE POLICY "Admins can read all export jobs"
  ON public.data_export_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert export jobs"
  ON public.data_export_jobs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'LAB_MANAGER')
    )
  );

CREATE POLICY "Service can update export jobs"
  ON public.data_export_jobs FOR UPDATE TO authenticated
  USING (true);

-- RLS for data_import_jobs
ALTER TABLE public.data_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own import jobs"
  ON public.data_import_jobs FOR SELECT TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can read all import jobs"
  ON public.data_import_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert import jobs"
  ON public.data_import_jobs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update import jobs"
  ON public.data_import_jobs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- RLS for data_audit_log
ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.data_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Service can insert audit log"
  ON public.data_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);
