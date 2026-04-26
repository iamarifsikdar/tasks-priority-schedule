-- ============================================================
-- PHASE 1: MULTI-TENANT REBUILD (destructive)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname IN ('automation-dispatcher-every-5-min','task-automation-dispatcher');
  END IF;
END $$;

DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.email_automation_settings CASCADE;
DROP TABLE IF EXISTS public.webhook_settings CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.automation_log_type CASCADE;
DROP TYPE IF EXISTS public.automation_log_status CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ENUMS
CREATE TYPE public.app_role        AS ENUM ('owner','admin','team_manager','member');
CREATE TYPE public.task_priority   AS ENUM ('urgent','high','medium','low');
CREATE TYPE public.task_status     AS ENUM ('pending','completed','archived');
CREATE TYPE public.announcement_category AS ENUM ('very_important','important','less_important','new_features');
CREATE TYPE public.automation_log_type   AS ENUM ('email','webhook');
CREATE TYPE public.automation_log_status AS ENUM ('success','error');
CREATE TYPE public.invite_status AS ENUM ('pending','accepted','revoked','expired');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6),'hex'),
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org  ON public.organization_members(org_id);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- SECURITY-DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id=_user_id AND org_id=_org_id);
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id=_user_id AND org_id=_org_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _org_id UUID)
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.organization_members WHERE user_id=_user_id AND org_id=_org_id LIMIT 1;
$$;

-- ORG POLICIES
CREATE POLICY "Members view their orgs" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Anyone signed in creates org" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners/admins update org" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Only owner deletes org" ON public.organizations FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER POLICIES
CREATE POLICY "Members view org memberships" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Owners/admins add members or self-join" ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
    OR auth.uid() = user_id
  );
CREATE POLICY "Owners/admins update roles" ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Admins remove or self-leave" ON public.organization_members FOR DELETE TO authenticated
  USING (
    public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
    OR auth.uid() = user_id
  );

-- AUTO-OWNER MEMBERSHIP
CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members(org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_org_add_owner AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_membership();

-- INVITES
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_org ON public.invites(org_id);
CREATE INDEX idx_invites_token ON public.invites(token);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org invites" ON public.invites FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins create invites" ON public.invites FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
    AND auth.uid() = created_by
  );
CREATE POLICY "Admins update invites" ON public.invites FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Admins delete invites" ON public.invites FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.lookup_invite(_token TEXT)
RETURNS TABLE (invite_id UUID, org_id UUID, org_name TEXT, role public.app_role, status public.invite_status, expires_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.org_id, o.name, i.role, i.status, i.expires_at
  FROM public.invites i JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = _token;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite(_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invite RECORD; v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_invite FROM public.invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invite'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite already used'; END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.invites SET status='expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Invite expired';
  END IF;
  INSERT INTO public.organization_members(org_id, user_id, role)
  VALUES (v_invite.org_id, v_user, v_invite.role) ON CONFLICT DO NOTHING;
  UPDATE public.invites SET status='accepted', accepted_at=now(), accepted_by=v_user WHERE id = v_invite.id;
  RETURN v_invite.org_id;
END; $$;

CREATE OR REPLACE FUNCTION public.join_org_by_code(_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_org_id UUID; v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_org_id FROM public.organizations WHERE invite_code = _code;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.organization_members(org_id, user_id, role)
  VALUES (v_org_id, v_user, 'member') ON CONFLICT DO NOTHING;
  RETURN v_org_id;
END; $$;

-- TASKS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
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
CREATE INDEX idx_tasks_org ON public.tasks(org_id);
CREATE INDEX idx_tasks_org_status ON public.tasks(org_id, status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TASK ASSIGNMENTS (created BEFORE referencing policies)
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  org_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, assignee_id)
);
CREATE INDEX idx_task_assign_task ON public.task_assignments(task_id);
CREATE INDEX idx_task_assign_user ON public.task_assignments(assignee_id);
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: is the user assigned to this task?
CREATE OR REPLACE FUNCTION public.is_task_assignee(_user_id UUID, _task_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.task_assignments WHERE task_id=_task_id AND assignee_id=_user_id);
$$;

-- TASK POLICIES (now safe to reference assignments via helper)
CREATE POLICY "Members view org tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Members create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id) AND auth.uid() = created_by);
CREATE POLICY "Author/admins/assignees update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
    OR public.is_task_assignee(auth.uid(), id)
  );
CREATE POLICY "Author/admins delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
  );

-- ASSIGNMENT POLICIES
CREATE POLICY "Members view org assignments" ON public.task_assignments FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Members assign tasks" ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id) AND auth.uid() = assigned_by);
CREATE POLICY "Assigner/admins remove assignment" ON public.task_assignments FOR DELETE TO authenticated
  USING (
    auth.uid() = assigned_by
    OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[])
  );

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  category public.announcement_category NOT NULL DEFAULT 'important',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ann_org ON public.announcements(org_id);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view announcements" ON public.announcements FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Members create announcements" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id) AND auth.uid() = author_id);
CREATE POLICY "Author/admins update announcements" ON public.announcements FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Author/admins delete announcements" ON public.announcements FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ANNOUNCEMENT READS
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
CREATE INDEX idx_ann_reads_user ON public.announcement_reads(user_id);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org reads" ON public.announcement_reads FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Users mark own reads" ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Users delete own reads" ON public.announcement_reads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ORG EMAIL AUTOMATION
CREATE TABLE public.org_email_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  email_subject TEXT NOT NULL DEFAULT 'Your Pending Priority Tasks',
  default_recipient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_email_automation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view email config" ON public.org_email_automation FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins manage email config" ON public.org_email_automation FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE TRIGGER trg_org_email_updated BEFORE UPDATE ON public.org_email_automation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORG WEBHOOK AUTOMATION
CREATE TABLE public.org_webhook_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_webhook_automation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view webhook config" ON public.org_webhook_automation FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Admins manage webhook config" ON public.org_webhook_automation FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin']::public.app_role[]));
CREATE TRIGGER trg_org_webhook_updated BEFORE UPDATE ON public.org_webhook_automation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MEMBER SCHEDULES
CREATE TABLE public.member_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  recipient_email TEXT,
  selected_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  send_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  last_email_sent_at TIMESTAMPTZ,
  last_email_sent_date DATE,
  last_email_status TEXT,
  last_email_error TEXT,
  last_webhook_sent_at TIMESTAMPTZ,
  last_webhook_sent_date DATE,
  last_webhook_status TEXT,
  last_webhook_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
CREATE INDEX idx_member_sched_user ON public.member_schedules(user_id);
ALTER TABLE public.member_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member or admin views schedules" ON public.member_schedules FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_org_role(auth.uid(), org_id, ARRAY['owner','admin','team_manager']::public.app_role[]));
CREATE POLICY "Members insert own schedule" ON public.member_schedules FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Members update own schedule" ON public.member_schedules FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Members delete own schedule" ON public.member_schedules FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER trg_member_sched_updated BEFORE UPDATE ON public.member_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTOMATION LOGS
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  type public.automation_log_type NOT NULL,
  status public.automation_log_status NOT NULL,
  triggered_by TEXT DEFAULT 'scheduler',
  task_count INTEGER DEFAULT 0,
  response JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_org ON public.automation_logs(org_id, sent_at DESC);
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org logs" ON public.automation_logs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Members insert org logs" ON public.automation_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), org_id));

-- APP CONFIG
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_config(key, value)
VALUES ('dispatcher_secret', encode(gen_random_bytes(32),'hex'))
ON CONFLICT (key) DO NOTHING;

-- NEW USER → PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKET
INSERT INTO storage.buckets(id, name, public)
VALUES ('attachments','attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org members read attachments" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Org members upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "Org members delete own attachments" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments'
    AND owner = auth.uid()
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- CRON
DO $$
DECLARE
  v_secret TEXT;
  v_url TEXT := 'https://ydouyjxonmezbwfphgau.supabase.co/functions/v1/automation-dispatcher';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
  SELECT value INTO v_secret FROM public.app_config WHERE key='dispatcher_secret';
  PERFORM cron.schedule(
    'automation-dispatcher-every-5-min',
    '*/5 * * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-dispatcher-secret', %L),
        body := jsonb_build_object('time', now()::text)
      );
    $cron$, v_url, v_secret)
  );
END $$;
