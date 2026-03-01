-- Billing & Invoicing Schema for AquaTrace
-- Customers billing details, invoices with line items, payments, subscriptions, AR aging

-- Extend customers with billing fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_info JSONB DEFAULT '{}';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_contact TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Extend invoices for full billing (alter existing table)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS taxes DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discounts DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS proration BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subscription_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update invoice status check to include draft, issued, refunded
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (
  status IN ('draft', 'issued', 'pending', 'paid', 'overdue', 'refunded', 'partially_paid')
);

-- Set due_date/issue_date from date if null
UPDATE public.invoices SET due_date = date WHERE due_date IS NULL;
UPDATE public.invoices SET issue_date = date WHERE issue_date IS NULL;

-- Invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'card' CHECK (method IN ('card', 'bank', 'cash', 'check', 'other')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

-- Subscriptions (for recurring billing)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  plan_id TEXT,
  quantity INTEGER DEFAULT 1,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  proration BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

-- Add subscription_id FK to invoices
ALTER TABLE public.invoices ADD CONSTRAINT invoices_subscription_fk
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- AR accounts (aging buckets)
CREATE TABLE IF NOT EXISTS public.ar_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_payment_date DATE,
  aging_current DECIMAL(12, 2) DEFAULT 0,
  aging_7 DECIMAL(12, 2) DEFAULT 0,
  aging_14 DECIMAL(12, 2) DEFAULT 0,
  aging_30 DECIMAL(12, 2) DEFAULT 0,
  aging_60 DECIMAL(12, 2) DEFAULT 0,
  aging_90_plus DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_accounts_customer ON public.ar_accounts(customer_id);

-- Settings (Stripe webhook secrets, currency, reminders cadence)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Lab managers and admins can manage billing
CREATE POLICY "Lab staff can manage invoice_items"
  ON public.invoice_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

CREATE POLICY "Lab staff can manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

CREATE POLICY "Lab staff can manage subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

CREATE POLICY "Lab staff can manage ar_accounts"
  ON public.ar_accounts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

CREATE POLICY "Lab staff can manage settings"
  ON public.settings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('LAB_MANAGER', 'ADMIN'))
  );

-- Customers can read their own invoice items (via invoice)
CREATE POLICY "Customers can read own invoice_items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.customers c ON i.customer_id = c.id
      WHERE i.id = invoice_items.invoice_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      JOIN public.customers c ON i.customer_id = c.id
      WHERE i.id = payments.invoice_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can read own subscriptions"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can read own ar_accounts"
  ON public.ar_accounts FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );
