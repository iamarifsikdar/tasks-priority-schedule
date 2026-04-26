-- Ensure the internal config table exists (no public access)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (and Postgres roles) can access

-- Generate a random dispatcher secret if one doesn't exist
INSERT INTO public.app_config (key, value)
VALUES ('dispatcher_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Unschedule the existing cron job (ignore error if it doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('task-scheduler-dispatch');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Re-schedule with the dispatcher secret header pulled from app_config at execution time
SELECT cron.schedule(
  'task-scheduler-dispatch',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ydouyjxonmezbwfphgau.supabase.co/functions/v1/automation-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dispatcher-secret', (SELECT value FROM public.app_config WHERE key = 'dispatcher_secret')
    ),
    body := jsonb_build_object('source', 'cron', 'invoked_at', now())
  ) AS request_id;
  $cron$
);