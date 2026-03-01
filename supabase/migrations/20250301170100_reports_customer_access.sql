-- Customer portal access to reports
-- Customers (CUSTOMER_VIEW role) can read their own reports and report versions

-- Customers can read reports for their customer record
CREATE POLICY "Customers can read own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
  );

-- Customers can read report versions for their reports
CREATE POLICY "Customers can read own report_versions"
  ON public.report_versions FOR SELECT TO authenticated
  USING (
    report_id IN (
      SELECT id FROM public.reports
      WHERE customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
      )
    )
  );
