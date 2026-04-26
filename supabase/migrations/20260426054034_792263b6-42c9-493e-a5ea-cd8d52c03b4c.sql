-- app_config holds internal server-only secrets (e.g. dispatcher_secret).
-- Only service_role should access it. RLS is enabled with intentionally
-- zero policies so authenticated/anon users can never read or write it.
COMMENT ON TABLE public.app_config IS
  'Internal server-only configuration. RLS enabled with no policies by design — only service_role may access.';

REVOKE ALL ON public.app_config FROM anon, authenticated;