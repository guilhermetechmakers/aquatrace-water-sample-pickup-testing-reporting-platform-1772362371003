-- Customer portal: allow customers to read report_attachments for their own reports

CREATE POLICY "Customers can read own report_attachments"
  ON public.report_attachments FOR SELECT TO authenticated
  USING (
    report_id IN (
      SELECT id FROM public.reports
      WHERE customer_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
      )
    )
  );
