-- Portal notifications: allow tenant-wide notifications (user_id IS NULL)
-- Customers can read and update notifications addressed to them OR tenant-wide (user_id null)

DROP POLICY IF EXISTS "Users can read own notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON public.portal_notifications;

CREATE POLICY "Users can read own and tenant-wide notifications"
  ON public.portal_notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND tenant_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own and tenant-wide notifications"
  ON public.portal_notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND tenant_id IN (
        SELECT id FROM public.customers WHERE user_id = auth.uid()
      )
    )
  );
