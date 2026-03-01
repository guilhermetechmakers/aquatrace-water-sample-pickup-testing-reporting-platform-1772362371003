-- Notifications & Alerts Schema for AquaTrace
-- Email (SendGrid), SMS/Voice (Twilio), Push (FCM), templates, events, webhooks, retries, dead-letters

-- Event types enum
DO $$ BEGIN
  CREATE TYPE notification_event_type AS ENUM (
    'pickup_assigned', 'pickup_completed', 'lab_results_ready',
    'approval_needed', 'invoice_created', 'invoice_paid', 'sla_breach',
    'verification', 'report_delivery'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Channel enum
DO $$ BEGIN
  CREATE TYPE notification_channel_type AS ENUM ('email', 'sms', 'push', 'in_app');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notification status enum
DO $$ BEGIN
  CREATE TYPE notification_status_type AS ENUM ('queued', 'in_progress', 'delivered', 'failed', 'deprecated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notification channels (user contact info and preferences)
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  push_token TEXT,
  preferred_channel notification_channel_type[] DEFAULT ARRAY['email']::notification_channel_type[],
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_user ON public.notification_channels(user_id);

-- Templates for email/SMS content
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  subject TEXT,
  html_body TEXT,
  text_body TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_name_lang ON public.notification_templates(name, language);
CREATE INDEX IF NOT EXISTS idx_notification_templates_published ON public.notification_templates(is_published) WHERE is_published = TRUE;

-- Events (incoming event queue)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(type);
CREATE INDEX IF NOT EXISTS idx_notification_events_created ON public.notification_events(created_at);

-- Notifications (individual delivery records)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type notification_event_type NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel notification_channel_type NOT NULL,
  status notification_status_type NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}',
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  fail_reason TEXT,
  is_dead_letter BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_dead_letter ON public.notifications(is_dead_letter) WHERE is_dead_letter = TRUE;

-- Webhooks for external systems
CREATE TABLE IF NOT EXISTS public.notification_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  events_enabled TEXT[] NOT NULL DEFAULT '{}',
  auth_secret TEXT,
  retries INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retries log
CREATE TABLE IF NOT EXISTS public.notification_retries_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_retries_notification ON public.notification_retries_log(notification_id);

-- Dead letters (failed after max retries)
CREATE TABLE IF NOT EXISTS public.notification_dead_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User notification preferences (channels, thresholds, blackout windows)
CREATE TABLE IF NOT EXISTS public.notification_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  channels_enabled JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "push": false, "in_app": true}',
  max_per_hour INTEGER DEFAULT 10,
  blackout_start TIME,
  blackout_end TIME,
  event_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_user_prefs_user ON public.notification_user_preferences(user_id);

-- System notification settings (SendGrid, Twilio, FCM config)
CREATE TABLE IF NOT EXISTS public.notification_system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  scope TEXT NOT NULL DEFAULT 'system' CHECK (scope IN ('user', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated at triggers
CREATE TRIGGER notification_channels_updated_at
  BEFORE UPDATE ON public.notification_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_user_preferences_updated_at
  BEFORE UPDATE ON public.notification_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_retries_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_system_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage own notification channels
CREATE POLICY "Users can manage own notification_channels"
  ON public.notification_channels FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Users can read own preferences
CREATE POLICY "Users can manage own notification_user_preferences"
  ON public.notification_user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Users can read own notifications
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

-- Admin/Lab Manager can read all notifications and templates
CREATE POLICY "Admin can read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'LAB_MANAGER'))
  );

-- Admin can manage templates
CREATE POLICY "Admin can manage notification_templates"
  ON public.notification_templates FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'LAB_MANAGER'))
  );

-- Admin can manage events (insert for enqueue)
CREATE POLICY "Admin and service can manage notification_events"
  ON public.notification_events FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'LAB_MANAGER', 'TECHNICIAN', 'LAB_TECH'))
  );

-- Admin can manage webhooks
CREATE POLICY "Admin can manage notification_webhooks"
  ON public.notification_webhooks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Admin can read retries and dead letters
CREATE POLICY "Admin can read notification_retries_log"
  ON public.notification_retries_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'LAB_MANAGER'))
  );

CREATE POLICY "Admin can read notification_dead_letters"
  ON public.notification_dead_letters FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'LAB_MANAGER'))
  );

-- Admin can manage system settings
CREATE POLICY "Admin can manage notification_system_settings"
  ON public.notification_system_settings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
  );

-- Add notifications to permissions resource (for RBAC)
-- The permissions table has a CHECK on resource - we may need to alter it
-- For now, admin_ui covers notification admin; technicians/lab can trigger events via app logic
-- Note: Enable Realtime for public.notifications in Supabase Dashboard for live updates
