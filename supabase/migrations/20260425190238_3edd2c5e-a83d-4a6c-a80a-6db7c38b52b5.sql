
-- Store project URL + anon key for cron usage in vault-like config
-- We use a settings table since we control the dispatcher logic in the edge function
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No public policies — only service role can access

-- Schedule dispatcher every 5 minutes
SELECT cron.schedule(
  'task-scheduler-dispatch',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ydouyjxonmezbwfphgau.supabase.co/functions/v1/automation-dispatcher',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'cron', 'invoked_at', now())
  ) AS request_id;
  $$
);
