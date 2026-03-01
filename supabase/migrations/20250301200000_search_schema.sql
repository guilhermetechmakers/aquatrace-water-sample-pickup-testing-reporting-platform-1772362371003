-- Search & Filter Schema for AquaTrace
-- saved_searches table, full-text search indexes for samples, reports, customers, invoices

-- Saved searches (user-scoped)
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('samples', 'reports', 'customers', 'invoices')),
  query TEXT DEFAULT '',
  filters JSONB NOT NULL DEFAULT '{}',
  sort_by TEXT DEFAULT 'updated_at',
  sort_dir TEXT DEFAULT 'desc' CHECK (sort_dir IN ('asc', 'desc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_type ON public.saved_searches(type);

-- RLS for saved_searches
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved_searches"
  ON public.saved_searches FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Full-text search: add tsvector columns and GIN indexes
-- Pickups (samples)
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_pickups_search ON public.pickups USING GIN(search_vector);

-- Update search_vector trigger for pickups
CREATE OR REPLACE FUNCTION public.pickups_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.vial_id, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sample_id, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.customer_site_notes, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.pickup_location_name, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pickups_search_vector_trigger ON public.pickups;
CREATE TRIGGER pickups_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION public.pickups_search_vector_update();

-- Backfill existing pickups
UPDATE public.pickups SET search_vector = 
  setweight(to_tsvector('english', coalesce(vial_id, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sample_id, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(customer_site_notes, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(pickup_location_name, '')), 'B')
WHERE search_vector IS NULL;

-- Reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_reports_search ON public.reports USING GIN(search_vector);

CREATE OR REPLACE FUNCTION public.reports_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.report_id, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_search_vector_trigger ON public.reports;
CREATE TRIGGER reports_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_search_vector_update();

UPDATE public.reports SET search_vector = setweight(to_tsvector('english', coalesce(report_id, '')), 'A')
WHERE search_vector IS NULL;

-- Customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_customers_search ON public.customers USING GIN(search_vector);

CREATE OR REPLACE FUNCTION public.customers_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_search_vector_trigger ON public.customers;
CREATE TRIGGER customers_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_search_vector_update();

UPDATE public.customers SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(email, '')), 'A')
WHERE search_vector IS NULL;

-- Invoices: add full-text search
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_invoices_search ON public.invoices USING GIN(search_vector);

CREATE OR REPLACE FUNCTION public.invoices_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('english', coalesce(NEW.invoice_id, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_search_vector_trigger ON public.invoices;
CREATE TRIGGER invoices_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_search_vector_update();

UPDATE public.invoices SET search_vector = setweight(to_tsvector('english', coalesce(invoice_id, '')), 'A')
WHERE search_vector IS NULL;

-- saved_searches updated_at trigger
CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
