-- PDF Report Generation & Distribution schema
-- Versioned reports, attachments, signatures, audit trail, email logs

-- Reports table (links approval to customer, versioned)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  approval_id UUID REFERENCES public.approvals(id) ON DELETE SET NULL,
  result_id UUID REFERENCES public.lab_results(id) ON DELETE SET NULL,
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
  report_id TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'distributed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(report_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_customer_id ON public.reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_reports_approval_id ON public.reports(approval_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Report versions (versioned PDFs with metadata)
CREATE TABLE IF NOT EXISTS public.report_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'distributed')),
  pdf_storage_path TEXT,
  pdf_hash TEXT,
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(report_id, version)
);

CREATE INDEX IF NOT EXISTS idx_report_versions_report_id ON public.report_versions(report_id);

-- Report attachments (files referenced in report)
CREATE TABLE IF NOT EXISTS public.report_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  file_hash TEXT,
  embedded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_attachments_report_id ON public.report_attachments(report_id);

-- Report signatures (manager signature per version)
CREATE TABLE IF NOT EXISTS public.report_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  signer_role TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_image_url TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_info TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_signatures_report_id ON public.report_signatures(report_id);

-- Report audit trail (append-only)
CREATE TABLE IF NOT EXISTS public.report_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'approved', 'reissued', 'emailed')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_audit_report_id ON public.report_audit(report_id);

-- Report email logs (delivery tracking)
CREATE TABLE IF NOT EXISTS public.report_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_emails_report_id ON public.report_emails(report_id);

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Reports: authenticated upload" ON storage.objects;
CREATE POLICY "Reports: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports');

DROP POLICY IF EXISTS "Reports: authenticated read" ON storage.objects;
CREATE POLICY "Reports: authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports');

-- RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_emails ENABLE ROW LEVEL SECURITY;

-- Lab managers and admins can manage reports
CREATE POLICY "Lab staff can read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can insert reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab managers can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

-- Report versions
CREATE POLICY "Lab staff can read report_versions"
  ON public.report_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage report_versions"
  ON public.report_versions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

-- Report attachments, signatures, audit, emails
CREATE POLICY "Lab staff can read report_attachments"
  ON public.report_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage report_attachments"
  ON public.report_attachments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab staff can read report_signatures"
  ON public.report_signatures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage report_signatures"
  ON public.report_signatures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab staff can read report_audit"
  ON public.report_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can insert report_audit"
  ON public.report_audit FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab staff can read report_emails"
  ON public.report_emails FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage report_emails"
  ON public.report_emails FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );
