-- RBAC Schema for AquaTrace
-- Roles, permissions, audit, pickups, lab_results, customer_reports

-- Roles table (reference data)
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'execute')),
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'owner', 'ownReport', 'organization')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, resource, action)
);

-- Role changes audit
CREATE TABLE IF NOT EXISTS public.role_changes_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_role TEXT,
  to_role TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access audit log (data access events)
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add role_id to profiles (references roles table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Customers table (for customer_reports ownership)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pickups table
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
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lab results table
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

-- Customer reports (links pickups to customers for visibility)
CREATE TABLE IF NOT EXISTS public.customer_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  pickup_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
  lab_result_id UUID REFERENCES public.lab_results(id) ON DELETE SET NULL,
  pdf_link TEXT,
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pickup_id, customer_id)
);

-- Insert default roles
INSERT INTO public.roles (id, name, description) VALUES
  (uuid_generate_v4(), 'TECHNICIAN', 'Field technician for sample pickup and onsite testing'),
  (uuid_generate_v4(), 'LAB_TECH', 'Lab technician for entering test results'),
  (uuid_generate_v4(), 'LAB_MANAGER', 'Lab manager for approval and PDF distribution'),
  (uuid_generate_v4(), 'ADMIN', 'System administrator'),
  (uuid_generate_v4(), 'CUSTOMER_VIEW', 'Customer viewer - reports only')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions (role-based capability matrix)
DO $$
DECLARE
  r_technician UUID;
  r_lab_tech UUID;
  r_lab_manager UUID;
  r_admin UUID;
  r_customer UUID;
BEGIN
  SELECT id INTO r_technician FROM public.roles WHERE name = 'TECHNICIAN';
  SELECT id INTO r_lab_tech FROM public.roles WHERE name = 'LAB_TECH';
  SELECT id INTO r_lab_manager FROM public.roles WHERE name = 'LAB_MANAGER';
  SELECT id INTO r_admin FROM public.roles WHERE name = 'ADMIN';
  SELECT id INTO r_customer FROM public.roles WHERE name = 'CUSTOMER_VIEW';

  -- Technician: pickup read/create/update (owner scope), dashboard
  INSERT INTO public.permissions (role_id, resource, action, scope) VALUES
    (r_technician, 'pickup', 'read', 'owner'),
    (r_technician, 'pickup', 'create', 'global'),
    (r_technician, 'pickup', 'update', 'owner'),
    (r_technician, 'technician_dashboard', 'read', 'global')
  ON CONFLICT (role_id, resource, action) DO NOTHING;

  -- Lab Tech: lab_results read/create/update, lab_queue
  INSERT INTO public.permissions (role_id, resource, action, scope) VALUES
    (r_lab_tech, 'lab_results', 'read', 'global'),
    (r_lab_tech, 'lab_results', 'create', 'global'),
    (r_lab_tech, 'lab_results', 'update', 'global'),
    (r_lab_tech, 'lab_queue', 'read', 'global'),
    (r_lab_tech, 'pickup', 'read', 'global')
  ON CONFLICT (role_id, resource, action) DO NOTHING;

  -- Lab Manager: approve, PDF, distribute
  INSERT INTO public.permissions (role_id, resource, action, scope) VALUES
    (r_lab_manager, 'lab_results', 'read', 'global'),
    (r_lab_manager, 'lab_results', 'update', 'global'),
    (r_lab_manager, 'lab_results', 'execute', 'global'),
    (r_lab_manager, 'reports', 'read', 'global'),
    (r_lab_manager, 'reports', 'execute', 'global'),
    (r_lab_manager, 'approvals', 'read', 'global'),
    (r_lab_manager, 'approvals', 'execute', 'global')
  ON CONFLICT (role_id, resource, action) DO NOTHING;

  -- Admin: full access
  INSERT INTO public.permissions (role_id, resource, action, scope) VALUES
    (r_admin, 'admin_ui', 'read', 'global'),
    (r_admin, 'admin_ui', 'create', 'global'),
    (r_admin, 'admin_ui', 'update', 'global'),
    (r_admin, 'admin_ui', 'delete', 'global'),
    (r_admin, 'admin_ui', 'execute', 'global'),
    (r_admin, 'roles', 'read', 'global'),
    (r_admin, 'roles', 'create', 'global'),
    (r_admin, 'roles', 'update', 'global'),
    (r_admin, 'roles', 'delete', 'global'),
    (r_admin, 'users', 'read', 'global'),
    (r_admin, 'users', 'update', 'global'),
    (r_admin, 'audit', 'read', 'global')
  ON CONFLICT (role_id, resource, action) DO NOTHING;

  -- Customer: reports read only (ownReport scope)
  INSERT INTO public.permissions (role_id, resource, action, scope) VALUES
    (r_customer, 'reports', 'read', 'ownReport'),
    (r_customer, 'customer_portal', 'read', 'global')
  ON CONFLICT (role_id, resource, action) DO NOTHING;
END $$;

-- RLS for roles (read-only for authenticated)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);

-- RLS for permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

-- RLS for role_changes_audit (admin insert, users read own)
ALTER TABLE public.role_changes_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read audit" ON public.role_changes_audit FOR SELECT TO authenticated USING (true);

-- RLS for access_audit_log
ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own access audit" ON public.access_audit_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read customers" ON public.customers FOR SELECT TO authenticated USING (true);

-- RLS for pickups (technician sees own, lab sees all, admin sees all)
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Technicians read own pickups" ON public.pickups FOR SELECT TO authenticated
  USING (
    technician_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN'))
  );
CREATE POLICY "Technicians insert pickups" ON public.pickups FOR INSERT TO authenticated WITH CHECK (technician_id = auth.uid());
CREATE POLICY "Technicians update own pickups" ON public.pickups FOR UPDATE TO authenticated
  USING (technician_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_MANAGER', 'ADMIN')));

-- RLS for lab_results
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lab roles read lab_results" ON public.lab_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN')));
CREATE POLICY "Lab tech insert lab_results" ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN')));
CREATE POLICY "Lab manager update lab_results" ON public.lab_results FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_MANAGER', 'ADMIN')));

-- RLS for customer_reports (customers see only their own)
ALTER TABLE public.customer_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers read own reports" ON public.customer_reports FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_MANAGER', 'ADMIN'))
  );
CREATE POLICY "Lab manager manage customer_reports" ON public.customer_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('LAB_MANAGER', 'ADMIN')));

-- Triggers for updated_at
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER pickups_updated_at BEFORE UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER lab_results_updated_at BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
