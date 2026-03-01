-- KPI Aggregates table for pre-aggregated analytics (analytic store)
-- ETL jobs populate this; dashboards read from it for performance

CREATE TABLE IF NOT EXISTS public.kpi_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  lab_id UUID,
  technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  test_volume INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  avg_turnaround_time_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
  error_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  sla_compliance DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, customer_id, lab_id, technician_id)
);

CREATE INDEX IF NOT EXISTS idx_kpi_aggregates_date ON public.kpi_aggregates(date);
CREATE INDEX IF NOT EXISTS idx_kpi_aggregates_customer ON public.kpi_aggregates(customer_id);
CREATE INDEX IF NOT EXISTS idx_kpi_aggregates_lab ON public.kpi_aggregates(lab_id);

-- RLS: Lab staff and admins can read
ALTER TABLE public.kpi_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab staff can read kpi_aggregates"
  ON public.kpi_aggregates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_TECH', 'LAB_MANAGER', 'ADMIN', 'VIEWER'))
  );

-- Allow LAB_MANAGER and ADMIN to manage (for ETL/backfill)
CREATE POLICY "Lab managers can manage kpi_aggregates"
  ON public.kpi_aggregates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Extend RLS: LAB_TECH and VIEWER need read access to sla_alerts and analytics_exports
-- Original policies allow LAB_MANAGER and ADMIN for ALL; add SELECT for LAB_TECH and VIEWER
CREATE POLICY "Lab staff read sla_alerts"
  ON public.sla_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('LAB_TECH', 'VIEWER'))
  );

CREATE POLICY "Lab staff read analytics_exports"
  ON public.analytics_exports FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('LAB_TECH', 'VIEWER'))
  );
