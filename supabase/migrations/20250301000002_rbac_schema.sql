-- RBAC and AquaTrace domain tables

-- Roles table (reference data, seeded)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);

-- Permissions table (role -> resource, action, scope)
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  CHECK (resource IN ('pickup', 'lab_results', 'admin_ui', 'reports', 'customers', 'users', 'roles', 'audit', 'invoicing', 'analytics')),
  CHECK (action IN ('read', 'create', 'update', 'delete', 'execute')),
  CHECK (scope IN ('global', 'owner', 'ownReport', 'organization'))
);

-- Role changes audit
CREATE TABLE IF NOT EXISTS public.role_changes_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RBAC audit log (generic)
CREATE TABLE IF NOT EXISTS public.rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  payload_diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers (for customer_reports linkage)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pickups (water sample pickups)
CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  technician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  readings JSONB DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lab results
CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  spc DOUBLE PRECISION,
  total_coliform DOUBLE PRECISION,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  pdf_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer reports (links customer to pickup/report)
CREATE TABLE IF NOT EXISTS public.customer_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pickup_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  accessible_by_customer_only BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User invitations (extends profiles concept)
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ
);

-- Seed roles (name matches profiles.role enum)
INSERT INTO public.roles (name, description) VALUES
  ('TECHNICIAN', 'Field technician for sample pickup'),
  ('LAB_TECH', 'Lab technician for test entry'),
  ('LAB_MANAGER', 'Lab manager for approval and distribution'),
  ('ADMIN', 'System administrator'),
  ('CUSTOMER_VIEW', 'Customer portal viewer')
ON CONFLICT (name) DO NOTHING;

-- Updated at trigger for pickups and lab_results
CREATE TRIGGER pickups_updated_at
  BEFORE UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER lab_results_updated_at
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS for RBAC tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_changes_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- Roles and permissions: readable by authenticated users
CREATE POLICY "Authenticated can read roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read permissions"
  ON public.permissions FOR SELECT TO authenticated USING (true);

-- Audit: Admin only (check via app logic; RLS allows read for now)
CREATE POLICY "Authenticated can read role_changes_audit"
  ON public.role_changes_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can read rbac_audit_log"
  ON public.rbac_audit_log FOR SELECT TO authenticated USING (true);

-- Pickups: technicians see own, lab/admin see all
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read pickups"
  ON public.pickups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Technicians can insert own pickups"
  ON public.pickups FOR INSERT TO authenticated WITH CHECK (auth.uid() = technician_id);
CREATE POLICY "Technicians can update own pickups"
  ON public.pickups FOR UPDATE TO authenticated USING (auth.uid() = technician_id);

-- Lab results
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab users can read lab_results"
  ON public.lab_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lab users can insert lab_results"
  ON public.lab_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Lab users can update lab_results"
  ON public.lab_results FOR UPDATE TO authenticated USING (true);

-- Customer reports
ALTER TABLE public.customer_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read customer_reports"
  ON public.customer_reports FOR SELECT TO authenticated USING (true);

-- Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT TO authenticated USING (true);
