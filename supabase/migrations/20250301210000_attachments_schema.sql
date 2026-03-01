-- File Upload & Secure Storage - Attachments schema
-- Supports photos, CSV exports, instrument raw files, PDFs with virus scanning, access control, audit

-- Attachments table (metadata for all uploaded files)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  s3_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  checksum TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id TEXT NOT NULL,
  access_control JSONB DEFAULT '{}',
  expiration_date TIMESTAMPTZ,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'clean', 'infected', 'failed')),
  scan_result JSONB,
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  attachment_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_related_entity ON public.attachments(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.attachments(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_scan_status ON public.attachments(scan_status);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON public.attachments(uploaded_at);

-- Attachment audit log (append-only)
CREATE TABLE IF NOT EXISTS public.attachment_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_attachment_audit_attachment_id ON public.attachment_audit(attachment_id);

-- Trigger for updated_at
CREATE TRIGGER attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachment_audit ENABLE ROW LEVEL SECURITY;

-- Attachments: Technicians can read/create their own; Lab/Admin can read all for their domain
CREATE POLICY "Technicians can read own attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (
    uploaded_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Technicians can insert attachments for pickups"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by_user_id = auth.uid()
    AND related_entity_type IN ('pickup', 'sample', 'lab_result', 'report')
  );

CREATE POLICY "Lab staff can read all attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab managers and admins can update attachments"
  ON public.attachments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab managers and admins can delete attachments"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

-- Attachment audit: Lab staff and admins can read
CREATE POLICY "Lab staff can read attachment_audit"
  ON public.attachment_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "System can insert attachment_audit"
  ON public.attachment_audit FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());
