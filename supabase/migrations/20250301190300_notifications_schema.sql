-- Notifications & Alerts subsystem for AquaTrace
-- Email (SendGrid), SMS (Twilio), Push (FCM), templates, webhooks, retries, dead-letter

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

-- Status enum
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

-- Templates (email/SMS with localization)
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
CREATE INDEX IF NOT EXISTS idx_notification_templates_published ON public.notification_templates(is_published);

-- Events (incoming event queue)
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_event_type NOT NULL,
  payload JSONB DEFAULT '{}',
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
  payload JSONB DEFAULT '{}',
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  fail_reason TEXT,
  is_dead_letter BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at);

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

-- Dead letters
CREATE TABLE IF NOT EXISTS public.notification_dead_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_dead_letters_created ON public.notification_dead_letters(created_at);

-- Webhooks
CREATE TABLE IF NOT EXISTS public.notification_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  events_enabled TEXT[] DEFAULT '{}',
  auth_secret TEXT,
  retries INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings (user/system)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  scope TEXT NOT NULL CHECK (scope IN ('user', 'system')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_key_scope ON public.notification_settings(key, scope);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_system_unique ON public.notification_settings(key) WHERE scope = 'system' AND user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_unique ON public.notification_settings(key, user_id) WHERE scope = 'user';

-- Updated at trigger
CREATE TRIGGER notification_channels_updated_at
  BEFORE UPDATE ON public.notification_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_retries_log_updated_at
  BEFORE UPDATE ON public.notification_retries_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_webhooks_updated_at
  BEFORE UPDATE ON public.notification_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_retries_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dead_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- notification_channels: users manage own
CREATE POLICY "Users can read own notification_channels"
  ON public.notification_channels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification_channels"
  ON public.notification_channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification_channels"
  ON public.notification_channels FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- notification_templates: admins manage, others read published
CREATE POLICY "Authenticated can read notification_templates"
  ON public.notification_templates FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Admins can insert notification_templates"
  ON public.notification_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );
CREATE POLICY "Admins can update notification_templates"
  ON public.notification_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- notification_events: service role inserts
CREATE POLICY "Users cannot read notification_events"
  ON public.notification_events FOR SELECT TO authenticated USING (FALSE);

-- notifications: users read own
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_user_id);

-- retries_log: admins read
CREATE POLICY "Admins can read notification_retries_log"
  ON public.notification_retries_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- dead_letters: admins read
CREATE POLICY "Admins can read notification_dead_letters"
  ON public.notification_dead_letters FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- webhooks: admins manage
CREATE POLICY "Admins can manage notification_webhooks"
  ON public.notification_webhooks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- notification_settings: users read/update own, admins read system
CREATE POLICY "Users can read own notification_settings"
  ON public.notification_settings FOR SELECT TO authenticated
  USING (scope = 'user' AND user_id = auth.uid() OR scope = 'system');
CREATE POLICY "Users can insert own notification_settings"
  ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (scope = 'user' AND user_id = auth.uid());
CREATE POLICY "Users can update own notification_settings"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (scope = 'user' AND user_id = auth.uid());
CREATE POLICY "Admins can insert system notification_settings"
  ON public.notification_settings FOR INSERT TO authenticated
  WITH CHECK (scope = 'system' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can update system notification_settings"
  ON public.notification_settings FOR UPDATE TO authenticated
  USING (scope = 'system' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
