-- Analytics & Reporting Schema for AquaTrace
-- SLA alerts, analytics exports, KPI aggregates

-- SLA Alerts (breach notifications)
CREATE TABLE IF NOT EXISTS public.sla_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  workflow_stage TEXT NOT NULL,
  breach_time TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  affected_order_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sla_alerts_status ON public.sla_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_breach_time ON public.sla_alerts(breach_time);
CREATE INDEX IF NOT EXISTS idx_sla_alerts_customer ON public.sla_alerts(customer_id);

-- Analytics Exports (scheduled and on-demand)
CREATE TABLE IF NOT EXISTS public.analytics_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('pdf', 'csv')),
  format TEXT NOT NULL DEFAULT 'csv',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  schedule TEXT CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  last_run TIMESTAMPTZ,
  file_url TEXT,
  filter_snapshot JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_exports_status ON public.analytics_exports(status);
CREATE INDEX IF NOT EXISTS idx_analytics_exports_created_at ON public.analytics_exports(created_at);

-- RLS
ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_exports ENABLE ROW LEVEL SECURITY;

-- Lab managers and admins can manage SLA alerts
CREATE POLICY "Lab staff can manage sla_alerts"
  ON public.sla_alerts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Lab managers and admins can manage analytics exports
CREATE POLICY "Lab staff can manage analytics_exports"
  ON public.analytics_exports FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );
