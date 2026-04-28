-- =========================================================
-- Phase 2: Super Admin platform system
-- =========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------- Tables ----------

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  totp_secret_encrypted bytea,
  totp_enrolled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Lock down: no client access. Only SECURITY DEFINER RPCs / service role.
DROP POLICY IF EXISTS "no client read platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "no client write platform_admins" ON public.platform_admins;
CREATE POLICY "no client read platform_admins" ON public.platform_admins FOR SELECT TO authenticated USING (false);
CREATE POLICY "no client write platform_admins" ON public.platform_admins FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.platform_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  view_as_org_id uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_pas_user ON public.platform_admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pas_token ON public.platform_admin_sessions(session_token);
ALTER TABLE public.platform_admin_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no client read pas" ON public.platform_admin_sessions;
DROP POLICY IF EXISTS "no client write pas" ON public.platform_admin_sessions;
CREATE POLICY "no client read pas" ON public.platform_admin_sessions FOR SELECT TO authenticated USING (false);
CREATE POLICY "no client write pas" ON public.platform_admin_sessions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  target_org_id uuid NOT NULL,
  target_org_name text,
  action text NOT NULL,            -- 'start' | 'end'
  reason text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imp_org ON public.impersonation_logs(target_org_id);
CREATE INDEX IF NOT EXISTS idx_imp_admin ON public.impersonation_logs(admin_user_id);
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

-- organizations: suspended flag
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- ---------- Helper functions ----------

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

-- Returns the org the current user is "viewing as" via a valid 2FA session.
-- Validated by matching the session_token passed in via setting 'request.platform_admin_token'
-- (set by edge function before calling RPCs). For RLS we rely on a simpler
-- helper: any active, non-expired session row for this user with a non-null view_as_org_id.
CREATE OR REPLACE FUNCTION public.current_view_as_org(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT view_as_org_id
  FROM public.platform_admin_sessions
  WHERE user_id = _user_id
    AND ended_at IS NULL
    AND expires_at > now()
    AND view_as_org_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- ---------- impersonation_logs RLS (super-admin read only) ----------
DROP POLICY IF EXISTS "Admins read impersonation logs" ON public.impersonation_logs;
CREATE POLICY "Admins read impersonation logs" ON public.impersonation_logs
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- ---------- Extend RLS: super admin read-only access to org data ----------

-- organizations
DROP POLICY IF EXISTS "Platform admins view all orgs" ON public.organizations;
CREATE POLICY "Platform admins view all orgs" ON public.organizations
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- organization_members
DROP POLICY IF EXISTS "Platform admins view all members" ON public.organization_members;
CREATE POLICY "Platform admins view all members" ON public.organization_members
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Platform admins view all profiles" ON public.profiles;
CREATE POLICY "Platform admins view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- tasks (only when actively viewing the org)
DROP POLICY IF EXISTS "Platform admins view org tasks" ON public.tasks;
CREATE POLICY "Platform admins view org tasks" ON public.tasks
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- task_assignments
DROP POLICY IF EXISTS "Platform admins view org assignments" ON public.task_assignments;
CREATE POLICY "Platform admins view org assignments" ON public.task_assignments
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- announcements
DROP POLICY IF EXISTS "Platform admins view org announcements" ON public.announcements;
CREATE POLICY "Platform admins view org announcements" ON public.announcements
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- announcement_reads
DROP POLICY IF EXISTS "Platform admins view org announcement_reads" ON public.announcement_reads;
CREATE POLICY "Platform admins view org announcement_reads" ON public.announcement_reads
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- member_schedules
DROP POLICY IF EXISTS "Platform admins view org schedules" ON public.member_schedules;
CREATE POLICY "Platform admins view org schedules" ON public.member_schedules
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- automation logs / configs
DROP POLICY IF EXISTS "Platform admins view org automation_logs" ON public.automation_logs;
CREATE POLICY "Platform admins view org automation_logs" ON public.automation_logs
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

DROP POLICY IF EXISTS "Platform admins view org email_automation" ON public.org_email_automation;
CREATE POLICY "Platform admins view org email_automation" ON public.org_email_automation
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

DROP POLICY IF EXISTS "Platform admins view org webhook_automation" ON public.org_webhook_automation;
CREATE POLICY "Platform admins view org webhook_automation" ON public.org_webhook_automation
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

DROP POLICY IF EXISTS "Platform admins view org invites" ON public.invites;
CREATE POLICY "Platform admins view org invites" ON public.invites
FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()) AND org_id = public.current_view_as_org(auth.uid()));

-- ---------- Bootstrap RPC ----------
-- Promotes the first user with the given email to platform admin.
-- No-op if any platform admin already exists.

CREATE OR REPLACE FUNCTION public.bootstrap_first_platform_admin(_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing int;
  v_user_id uuid;
BEGIN
  SELECT count(*) INTO v_existing FROM public.platform_admins;
  IF v_existing > 0 THEN
    RAISE EXCEPTION 'A platform admin already exists';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user with email %', _email;
  END IF;
  INSERT INTO public.platform_admins(user_id, email)
  VALUES (v_user_id, lower(_email));
  RETURN v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_platform_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_platform_admin(text) TO authenticated;

-- ---------- Super-admin organization mutation RPCs ----------

CREATE OR REPLACE FUNCTION public.super_admin_create_organization(_name text, _owner_email text)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_org public.organizations;
BEGIN
  IF NOT public.is_platform_admin(v_user) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _name IS NULL OR length(btrim(_name)) = 0 THEN RAISE EXCEPTION 'Name required'; END IF;
  SELECT id INTO v_owner FROM auth.users WHERE lower(email) = lower(_owner_email) LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner user not found for email %', _owner_email; END IF;
  INSERT INTO public.organizations(name, slug, owner_id)
  VALUES (btrim(_name), encode(extensions.gen_random_bytes(6),'hex'), v_owner)
  RETURNING * INTO v_org;
  RETURN v_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_organization(_org_id uuid, _name text)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org public.organizations;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.organizations SET name = btrim(_name), updated_at = now()
  WHERE id = _org_id RETURNING * INTO v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Org not found'; END IF;
  RETURN v_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_set_org_suspended(_org_id uuid, _suspended boolean)
RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org public.organizations;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.organizations
    SET suspended = _suspended,
        suspended_at = CASE WHEN _suspended THEN now() ELSE NULL END,
        updated_at = now()
  WHERE id = _org_id RETURNING * INTO v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Org not found'; END IF;
  RETURN v_org;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_delete_organization(_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  DELETE FROM public.tasks WHERE org_id = _org_id;
  DELETE FROM public.announcements WHERE org_id = _org_id;
  DELETE FROM public.member_schedules WHERE org_id = _org_id;
  DELETE FROM public.org_email_automation WHERE org_id = _org_id;
  DELETE FROM public.org_webhook_automation WHERE org_id = _org_id;
  DELETE FROM public.automation_logs WHERE org_id = _org_id;
  DELETE FROM public.invites WHERE org_id = _org_id;
  DELETE FROM public.organization_members WHERE org_id = _org_id;
  DELETE FROM public.organizations WHERE id = _org_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.super_admin_create_organization(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.super_admin_update_organization(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.super_admin_set_org_suspended(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.super_admin_delete_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_create_organization(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_organization(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_org_suspended(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_delete_organization(uuid) TO authenticated;

-- Platform metrics RPC (aggregate counts only)
CREATE OR REPLACE FUNCTION public.super_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'organizations_total', (SELECT count(*) FROM public.organizations),
    'organizations_active', (SELECT count(*) FROM public.organizations WHERE NOT suspended),
    'organizations_suspended', (SELECT count(*) FROM public.organizations WHERE suspended),
    'users_total', (SELECT count(*) FROM auth.users),
    'tasks_total', (SELECT count(*) FROM public.tasks),
    'tasks_pending', (SELECT count(*) FROM public.tasks WHERE status = 'pending'),
    'announcements_total', (SELECT count(*) FROM public.announcements)
  ) INTO r;
  RETURN r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.super_admin_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_metrics() TO authenticated;

-- List orgs with member/task counts for super-admin dashboard
CREATE OR REPLACE FUNCTION public.super_admin_list_organizations()
RETURNS TABLE(id uuid, name text, slug text, owner_id uuid, owner_email text, suspended boolean, member_count bigint, task_count bigint, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT o.id, o.name, o.slug, o.owner_id,
           (SELECT email FROM auth.users WHERE auth.users.id = o.owner_id),
           o.suspended,
           (SELECT count(*) FROM public.organization_members m WHERE m.org_id = o.id),
           (SELECT count(*) FROM public.tasks t WHERE t.org_id = o.id),
           o.created_at
    FROM public.organizations o
    ORDER BY o.created_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.super_admin_list_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_list_organizations() TO authenticated;

-- List users with org count
CREATE OR REPLACE FUNCTION public.super_admin_list_users()
RETURNS TABLE(user_id uuid, email text, display_name text, org_count bigint, is_platform_admin boolean, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text,
           (SELECT display_name FROM public.profiles p WHERE p.user_id = u.id),
           (SELECT count(*) FROM public.organization_members m WHERE m.user_id = u.id),
           EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = u.id),
           u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC
    LIMIT 500;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.super_admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_list_users() TO authenticated;
