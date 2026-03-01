-- Customer Portal - Share links, invoices, reissue requests, audit, notifications
-- Multi-tenant support for secure report access

-- Share links (time-limited, revocable)
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('report', 'invoice')),
  target_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_links_tenant ON public.share_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_expires ON public.share_links(expires_at);

-- Invoices (for customer portal)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Reissue requests (customer-initiated)
CREATE TABLE IF NOT EXISTS public.reissue_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reissue_requests_report ON public.reissue_requests(report_id);
CREATE INDEX IF NOT EXISTS idx_reissue_requests_customer ON public.reissue_requests(customer_id);

-- Portal audit log (access, download, share events)
CREATE TABLE IF NOT EXISTS public.portal_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_log_tenant ON public.portal_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_log_created ON public.portal_audit_log(created_at);

-- Portal notifications
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('new_report', 'new_invoice', 'action_required', 'reissue_complete', 'reissue_ready')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_tenant ON public.portal_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_user ON public.portal_notifications(user_id);

-- Support tickets (reissue requests, general support)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON public.support_tickets(tenant_id);

-- RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reissue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Share links: customers can manage their own
CREATE POLICY "Customers can read own share_links"
  ON public.share_links FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can insert own share_links"
  ON public.share_links FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Lab staff can read share_links"
  ON public.share_links FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Invoices: customers can read their own
CREATE POLICY "Customers can read own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Lab staff can manage invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Reissue requests: customers can create, lab staff can read/manage
CREATE POLICY "Customers can read own reissue_requests"
  ON public.reissue_requests FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can insert reissue_requests"
  ON public.reissue_requests FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Lab staff can manage reissue_requests"
  ON public.reissue_requests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Portal audit log: customers can read/insert their own
CREATE POLICY "Customers can read own portal_audit_log"
  ON public.portal_audit_log FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can insert portal_audit_log"
  ON public.portal_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Portal notifications: customers can read/update their own
CREATE POLICY "Customers can read own portal_notifications"
  ON public.portal_notifications FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can update own portal_notifications"
  ON public.portal_notifications FOR UPDATE TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Support tickets: customers can create and read their own
CREATE POLICY "Customers can read own support_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can insert support_tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Lab staff can manage support_tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );
