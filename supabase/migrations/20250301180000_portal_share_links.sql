-- Customer Portal: Share links, invitations, support tickets, notifications
-- Enables secure expiring share links, user invitations, support requests, and notifications

-- Share links (time-limited, revocable links for reports/invoices)
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

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Customers can create and read their own share links
CREATE POLICY "Customers can manage own share_links"
  ON public.share_links FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Lab managers can read share links for customer reports
CREATE POLICY "Lab staff can read share_links"
  ON public.share_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN', 'LAB_TECH')
    )
  );

-- Portal invitations (invite users within customer org)
CREATE TABLE IF NOT EXISTS public.portal_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER_VIEW' CHECK (role IN ('CUSTOMER_VIEW', 'ADMIN')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_invitations_tenant ON public.portal_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_invitations_token ON public.portal_invitations(token);

ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage own invitations"
  ON public.portal_invitations FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Support tickets (for customer support requests)
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

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage own support_tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- Portal notifications (in-app notifications for new reports, etc.)
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_report', 'new_invoice', 'reissue_ready', 'action_required')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_notifications_user ON public.portal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_tenant ON public.portal_notifications(tenant_id);

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.portal_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark read)"
  ON public.portal_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Portal audit log (access, download, share events)
CREATE TABLE IF NOT EXISTS public.portal_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'report_viewed', 'report_downloaded', 'invoice_viewed', 'invoice_downloaded',
    'share_link_created', 'share_link_used', 'reissue_requested', 'support_ticket_created'
  )),
  item_type TEXT NOT NULL,
  item_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_audit_tenant ON public.portal_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_audit_created ON public.portal_audit_log(created_at);

ALTER TABLE public.portal_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own audit"
  ON public.portal_audit_log FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can insert own audit"
  ON public.portal_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );
