-- Lab Manager Approval & Audit schema
-- Supports approval queue, electronic signatures, comments, audit trail, corrective actions

-- Approvals table (links to lab_results; one approval per result submission)
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  sample_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'approved', 'rejected', 'corrective_action'
  )),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_due TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  test_results JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(result_id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_assigned_to ON public.approvals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approvals_sla_due ON public.approvals(sla_due);
CREATE INDEX IF NOT EXISTS idx_approvals_sample_id ON public.approvals(sample_id);
CREATE INDEX IF NOT EXISTS idx_approvals_customer_id ON public.approvals(customer_id);

CREATE TRIGGER approvals_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Approvals signatures (electronic signature capture) - created before audit for FK
CREATE TABLE IF NOT EXISTS public.approvals_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_blob TEXT,
  payload_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_signatures_approval_id ON public.approvals_signatures(approval_id);

-- Approvals audit trail (append-only, immutable)
CREATE TABLE IF NOT EXISTS public.approvals_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'approved', 'rejected', 'signed', 'corrective_action', 'reassigned', 'comment_added'
  )),
  by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details TEXT,
  signature_id UUID REFERENCES public.approvals_signatures(id) ON DELETE SET NULL,
  payload_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_approvals_audit_approval_id ON public.approvals_audit(approval_id);

-- Approvals comments (manager replies, notes)
CREATE TABLE IF NOT EXISTS public.approvals_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_comments_approval_id ON public.approvals_comments(approval_id);

-- Approvals files (supporting files, manager uploads; lab result attachments fetched via result_id)
CREATE TABLE IF NOT EXISTS public.approvals_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_files_approval_id ON public.approvals_files(approval_id);

-- Corrective actions (when status = corrective_action)
CREATE TABLE IF NOT EXISTS public.approvals_corrective_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_corrective_approval_id ON public.approvals_corrective_actions(approval_id);

-- RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals_corrective_actions ENABLE ROW LEVEL SECURITY;

-- Lab managers and admins can manage approvals
CREATE POLICY "Lab managers can view approvals"
  ON public.approvals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can insert approvals"
  ON public.approvals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can update approvals"
  ON public.approvals FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

-- Audit, comments, signatures, files - lab staff can read
CREATE POLICY "Lab staff can read approvals_audit"
  ON public.approvals_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can insert approvals_audit"
  ON public.approvals_audit FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab staff can read approvals_comments"
  ON public.approvals_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage approvals_comments"
  ON public.approvals_comments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab staff can read approvals_signatures"
  ON public.approvals_signatures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can insert approvals_signatures"
  ON public.approvals_signatures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );

CREATE POLICY "Lab staff can read approvals_files"
  ON public.approvals_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage approvals_files"
  ON public.approvals_files FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab staff can read approvals_corrective_actions"
  ON public.approvals_corrective_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

CREATE POLICY "Lab managers can manage approvals_corrective_actions"
  ON public.approvals_corrective_actions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN')
    )
  );
