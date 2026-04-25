
-- =============== EXTENSIONS ===============
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- =============== ENUMS ===============
CREATE TYPE public.task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE public.task_status AS ENUM ('pending', 'completed', 'archived');
CREATE TYPE public.automation_type AS ENUM ('email', 'webhook');
CREATE TYPE public.automation_status AS ENUM ('success', 'error', 'skipped');

-- =============== UPDATED_AT TRIGGER FUNCTION ===============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============== PROFILES ===============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.email_automation_settings (user_id, recipient_email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.webhook_settings (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- =============== TASKS ===============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_priority ON public.tasks(user_id, priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(user_id, due_date);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== EMAIL AUTOMATION SETTINGS ===============
CREATE TABLE public.email_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  selected_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Sun..6=Sat
  send_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  email_subject TEXT NOT NULL DEFAULT 'Your Pending Priority Tasks',
  recipient_email TEXT NOT NULL,
  last_sent_at TIMESTAMPTZ,
  last_sent_date DATE,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email settings" ON public.email_automation_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email settings" ON public.email_automation_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email settings" ON public.email_automation_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON public.email_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== WEBHOOK SETTINGS ===============
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  use_email_schedule BOOLEAN NOT NULL DEFAULT true,
  selected_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  send_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_sent_at TIMESTAMPTZ,
  last_sent_date DATE,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook settings" ON public.webhook_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own webhook settings" ON public.webhook_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own webhook settings" ON public.webhook_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_webhook_settings_updated_at
  BEFORE UPDATE ON public.webhook_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== AUTOMATION LOGS ===============
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.automation_type NOT NULL,
  status public.automation_status NOT NULL,
  response JSONB,
  error_message TEXT,
  task_count INTEGER DEFAULT 0,
  triggered_by TEXT DEFAULT 'scheduler', -- 'scheduler' | 'manual' | 'test'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_logs_user ON public.automation_logs(user_id, sent_at DESC);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.automation_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.automation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.automation_logs
  FOR DELETE USING (auth.uid() = user_id);

-- =============== AUTH TRIGGER ===============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
