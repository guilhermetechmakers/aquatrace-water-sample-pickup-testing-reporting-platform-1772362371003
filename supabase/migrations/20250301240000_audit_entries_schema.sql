-- System-wide Audit Trail (Compliance)
-- Append-only, immutable log for all critical actions across AquaTrace
-- Supports hash chaining for tamper-evidence, optional digital signatures

CREATE TABLE IF NOT EXISTS public.audit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'READ', 'WRITE', 'APPROVE', 'REJECT', 'DOWNLOAD', 'SIGN_OFF', 'EXPORT', 'DISTRIBUTE', 'CREATE', 'UPDATE', 'DELETE'
  )),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  hash TEXT NOT NULL,
  previous_hash TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_entries_timestamp ON public.audit_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entries_user_id ON public.audit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_action_type ON public.audit_entries(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_entries_resource_type ON public.audit_entries(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_entries_resource_id ON public.audit_entries(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_created_at ON public.audit_entries(created_at DESC);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS idx_audit_entries_metadata ON public.audit_entries USING GIN (metadata);

-- RLS: Admin only can read; authenticated users can insert (via service/Edge Function)
ALTER TABLE public.audit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit_entries"
  ON public.audit_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'
    )
  );

-- Service role / Edge Functions insert via service role; for client inserts we allow authenticated
-- (audit creation happens server-side in Edge Functions with service role)
CREATE POLICY "Authenticated can insert audit_entries"
  ON public.audit_entries FOR INSERT TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies - append-only by design
